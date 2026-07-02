export function gql(strings, ...args) {
  let str = "";
  strings.forEach((string, i) => {
    str += string + (args[i] || "");
  });
  return str;
}
export const UserPartsFragmentDoc = gql`
    fragment UserParts on User {
  __typename
  users {
    __typename
    username
    name
    email
    password {
      value
      passwordChangeRequired
    }
  }
}
    `;
export const BlessingPartsFragmentDoc = gql`
    fragment BlessingParts on Blessing {
  __typename
  brand
  logo
  logoAlt
  favicon
  nav {
    __typename
    label
    href
  }
  footerNote
  hero {
    __typename
    eyebrow
    title
    subtitle
    ctaLabel
    ctaHref
    image
    imageAlt
  }
  logos {
    __typename
    eyebrow
    title
    items {
      __typename
      src
      alt
    }
  }
  services {
    __typename
    eyebrow
    title
    items {
      __typename
      title
      description
    }
  }
  stats {
    __typename
    eyebrow
    title
    items {
      __typename
      value
      label
    }
  }
  cases {
    __typename
    eyebrow
    title
    items {
      __typename
      client
      metric
      situation
      result
      logo
      logoAlt
      image
      imageAlt
      href
    }
  }
  about {
    __typename
    eyebrow
    title
    paragraphs
  }
  people {
    __typename
    eyebrow
    title
    items {
      __typename
      name
      role
      image
      imageAlt
    }
  }
  testimonials {
    __typename
    eyebrow
    title
    items {
      __typename
      quote
      author
      role
    }
  }
  cta {
    __typename
    title
    subtitle
    ctaLabel
    ctaHref
  }
  map {
    __typename
    title
    address
  }
}
    `;
export const UserDocument = gql`
    query user($relativePath: String!) {
  user(relativePath: $relativePath) {
    ... on Document {
      _sys {
        filename
        basename
        hasReferences
        breadcrumbs
        path
        relativePath
        extension
      }
      id
    }
    ...UserParts
  }
}
    ${UserPartsFragmentDoc}`;
export const UserConnectionDocument = gql`
    query userConnection($before: String, $after: String, $first: Float, $last: Float, $sort: String, $filter: UserFilter) {
  userConnection(
    before: $before
    after: $after
    first: $first
    last: $last
    sort: $sort
    filter: $filter
  ) {
    pageInfo {
      hasPreviousPage
      hasNextPage
      startCursor
      endCursor
    }
    totalCount
    edges {
      cursor
      node {
        ... on Document {
          _sys {
            filename
            basename
            hasReferences
            breadcrumbs
            path
            relativePath
            extension
          }
          id
        }
        ...UserParts
      }
    }
  }
}
    ${UserPartsFragmentDoc}`;
export const BlessingDocument = gql`
    query blessing($relativePath: String!) {
  blessing(relativePath: $relativePath) {
    ... on Document {
      _sys {
        filename
        basename
        hasReferences
        breadcrumbs
        path
        relativePath
        extension
      }
      id
    }
    ...BlessingParts
  }
}
    ${BlessingPartsFragmentDoc}`;
export const BlessingConnectionDocument = gql`
    query blessingConnection($before: String, $after: String, $first: Float, $last: Float, $sort: String, $filter: BlessingFilter) {
  blessingConnection(
    before: $before
    after: $after
    first: $first
    last: $last
    sort: $sort
    filter: $filter
  ) {
    pageInfo {
      hasPreviousPage
      hasNextPage
      startCursor
      endCursor
    }
    totalCount
    edges {
      cursor
      node {
        ... on Document {
          _sys {
            filename
            basename
            hasReferences
            breadcrumbs
            path
            relativePath
            extension
          }
          id
        }
        ...BlessingParts
      }
    }
  }
}
    ${BlessingPartsFragmentDoc}`;
export function getSdk(requester) {
  return {
    user(variables, options) {
      return requester(UserDocument, variables, options);
    },
    userConnection(variables, options) {
      return requester(UserConnectionDocument, variables, options);
    },
    blessing(variables, options) {
      return requester(BlessingDocument, variables, options);
    },
    blessingConnection(variables, options) {
      return requester(BlessingConnectionDocument, variables, options);
    }
  };
}
import { createClient } from "tinacms/dist/client";
const generateRequester = (client) => {
  const requester = async (doc, vars, options) => {
    let url = client.apiUrl;
    if (options?.branch) {
      const index = client.apiUrl.lastIndexOf("/");
      url = client.apiUrl.substring(0, index + 1) + options.branch;
    }
    const data = await client.request({
      query: doc,
      variables: vars,
      url
    }, options);
    return { data: data?.data, errors: data?.errors, query: doc, variables: vars || {} };
  };
  return requester;
};
export const ExperimentalGetTinaClient = () => getSdk(
  generateRequester(
    createClient({
      url: "/api/tina/gql",
      queries
    })
  )
);
export const queries = (client) => {
  const requester = generateRequester(client);
  return getSdk(requester);
};
