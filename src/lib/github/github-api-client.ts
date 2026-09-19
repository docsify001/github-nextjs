import debugPackage from "debug";
import { GraphQLClient } from "graphql-request";
import scrapeIt from "scrape-it";

import { processReadMeHtml } from "./process-readme-html";
import { extractRepoInfo, queryRepoInfo, queryRepoInfoBasic } from "./repo-info-query";
import { extractUserInfo, queryUserInfo } from "./user-info-query";
import { processReadMeMd } from "./process-readme-md";

const debug = debugPackage("github");

export function createGitHubClient() {
  const accessToken = process.env.GITHUB_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("GITHUB_ACCESS_TOKEN is required!");
  }
  const graphQLClient = new GraphQLClient("https://api.github.com/graphql", {
    headers: {
      authorization: `bearer ${accessToken}`,
    },
  });

  async function makeRestApiRequest(
    endPoint: string,
    accept = "application/vnd.github.v3+json"
  ) {
    const url = `https://api.github.com/${endPoint}`;
    const options = {
      headers: {
        accept,
        authorization: `token ${accessToken}`,
      },
    };
    const response = await fetch(url, options);
    debug("Remaining API calls", response.headers.get("x-ratelimit-remaining")); // auth credentials are needed to avoid the default limit (60)
    return response;
  }

  function makeRestApiRequestJSON(endPoint: string) {
    return makeRestApiRequest(endPoint).then((response) => response.json());
  }

  const fetchRepoInfoMain = (fullName: string, query = queryRepoInfo) => {
    const [owner, name] = fullName.split("/");
    debug("Fetch repo info from GitHub GraphQL", owner, name);
    return graphQLClient
      .request(query, { owner, name })
      .then(extractRepoInfo)
      .catch((error) => {
        const message = error.response && error.response.message;
        if (message) throw new Error(`GraphQL API error "${message}"`);
        throw error;
      });
  };

  // Backfill counts that the reduced query omits (stargazers/watchers/forks)
  // using the REST API, which serves public repo metadata to any valid token.
  const backfillRepoStats = async <T extends object>(
    repoInfo: T,
    fullName: string
  ): Promise<T> => {
    const rest = await makeRestApiRequestJSON(`repos/${fullName}`);
    if (!rest || typeof rest !== "object") return repoInfo;
    const record = repoInfo as Record<string, unknown>;
    if (Number.isInteger(rest.stargazers_count)) {
      record.stargazers_count = rest.stargazers_count;
    }
    if (Number.isInteger(rest.subscribers_count)) {
      record.watchers_count = rest.subscribers_count;
    }
    if (Number.isInteger(rest.forks_count)) {
      record.forks = rest.forks_count;
    }
    const topicsResponse = await makeRestApiRequestJSON(`repos/${fullName}/topics`);
    if (Array.isArray(topicsResponse?.names)) {
      record.topics = topicsResponse.names;
    }
    return repoInfo;
  };

  const fetchRepoInfoFallback = async (fullName: string) => {
    debug("Fetch repo info using the REST API", fullName);
    const repoInfo = await makeRestApiRequestJSON(`repos/${fullName}`);
    debug(repoInfo);
    if (repoInfo.status === 404) throw new Error(`Repo not found!`);

    // TODO validate API response
    const { name, full_name, description, stargazers_count, owner } = repoInfo;
    return {
      name,
      full_name,
      description,
      stargazers_count,
      owner_id: owner.id,
    };
  };

  const fetchRepoInfoSafe = async (fullName: string) => {
    try {
      const repoInfo = await fetchRepoInfoMain(fullName);
      return repoInfo;
    } catch (error) {
      if (isErrorType(error, "NOT_FOUND")) {
        debug(`The repo "${fullName}" was not found, try the fallback method!`);
        const { full_name: updatedFullName } =
          await fetchRepoInfoFallback(fullName);
        const repoInfo = await fetchRepoInfoMain(updatedFullName);
        return repoInfo;
      }
      if (isErrorType(error, "FORBIDDEN")) {
        // Some GraphQL connections (stargazers, mentionableUsers, releases,
        // pullRequests, watchers, repositoryTopics...) are restricted for the
        // current token. Retry with the reduced query and backfill the counts
        // from the REST API instead of failing the whole request.
        debug(
          `GraphQL access restricted for "${fullName}", retrying with the reduced query`
        );
        const repoInfo = await fetchRepoInfoMain(fullName, queryRepoInfoBasic);
        return backfillRepoStats(repoInfo, fullName);
      }
      throw error;
    }
  };

  const isErrorType = (error: unknown, type: string) => {
    const errorType = (error as any).response?.errors?.[0]?.type;
    return errorType === type;
  };

  // === Public API for the GitHub client ===

  return {
    fetchRepoInfo: fetchRepoInfoSafe,

    fetchRepoInfoFallback,

    async fetchContributorCount(fullName: string) {
      debug(`Fetching the number of contributors by scraping`, fullName);
      const url = `https://github.com/${fullName}`;
      const {
        data: { contributor_count },
      } = await scrapeIt<{ contributor_count: number }>(url, {
        contributor_count: {
          selector: `a[href="/${fullName}/graphs/contributors"] .Counter`,
          convert: toInteger,
        },
      });
      return contributor_count;
    },

    async fetchUserInfo(login: string) {
      debug("Fetch user info from GitHub GraphQL", login);
      return graphQLClient
        .request(queryUserInfo, { login })
        .then(extractUserInfo);
    },

    async fetchRepoReadMeAsHtml(fullName: string, branch = "main") {
      const html = await makeRestApiRequest(
        `repos/${fullName}/readme`,
        "application/vnd.github.VERSION.html"
      ).then((response) => response.text());
      console.log("[fetchRepoReadMeAsHtml] html\n",  html);
      const readme = processReadMeHtml(html, fullName, branch);
      return readme;
    },

    async fetchRepoReadMeAsMarkdown(fullName: string, branch = "main") {
      debug(`Fetching README as markdown for ${fullName}`);
      try {
        const response = await makeRestApiRequest(
          `repos/${fullName}/readme`,
          "application/vnd.github.v3.raw"
        );
        
        if (!response.ok) {
          if (response.status === 404) {
            debug(`README not found for ${fullName}`);
            return null;
          }
          throw new Error(`Failed to fetch README: ${response.status}`);
        }
        
        const markdown = await response.text();
        const readme = await processReadMeMd(markdown, fullName, branch);
        return readme;
      } catch (error) {
        debug(`Error fetching README for ${fullName}:`, error);
        return null;
      }
    },
  };
}

// Convert a String from the web page E.g. `1,300` into an Integer
const toInteger = (source: string) => {
  const onlyNumbers = source.replace(/[^\d]/, "");
  return !onlyNumbers || isNaN(Number(onlyNumbers))
    ? 0
    : parseInt(onlyNumbers, 10);
};
