import {
    createSSRApp
} from "vue";
import tabBarConfig from './pages.json'

import App from "./App.vue";
export function createApp() {
    const app = createSSRApp(App);
    return {
        app,
    };
}