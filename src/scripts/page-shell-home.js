import "./inject-home-font-preloads.js";
import { runPageShell } from "./page-shell-core.js";
import { getPageTemplate, preparePageDocument } from "../templates/page-templates-home.js";

runPageShell({ getPageTemplate, preparePageDocument });
