var app = angular.module("gettingStarted", ['ngRoute', 'ngSanitize', 'gettext']);

app.config(['$httpProvider', '$routeProvider', '$locationProvider', '$provide', function ($httpProvider, $routeProvider, $locationProvider, $provide) {

    // Define routes
    $routeProvider.when("/", { templateUrl: "../getting-started/index.html", reloadOnSearch: false });

    // Load highlight.js
    hljs.initHighlightingOnLoad();

    // Set the favicon
    var faviconUrl = "images/favicon.ico";
    if (window.__settings.app.favicon_full) {
        faviconUrl = window.__settings.app.favicon_full;
    }

    var favicon = document.createElement("link");
    favicon.setAttribute("rel", "icon");
    favicon.setAttribute("type", "image/x-icon");
    favicon.setAttribute("href", faviconUrl);
    document.head.appendChild(favicon);

}]);


