import { createClient } from "tinacms/dist/client";
import { queries } from "./types.js";
export const client = createClient({ cacheDir: 'C:/Users/Joelle Trapani/Projekte/blessing-marketing-od-cms/tina/__generated__/.cache/1783060914112', url: '/api/tina/gql', token: 'undefined', queries,  });
export default client;
  