var app = angular.module("gettingStarted", ['ngRoute', 'ngSanitize', 'gettext']);

app.config(['$httpProvider', '$routeProvider', '$locationProvider', '$provide', function ($httpProvider, $routeProvider, $locationProvider, $provide) {

    // Define routes
    $routeProvider.when("/", { templateUrl: "../getting-started/index.html", reloadOnSearch: false });

    // Load highlight.js
    hljs.initHighlightingOnLoad();

    // Set the favicon
    var favicon = document.createElement("link");
    favicon.setAttribute("rel", "icon");
    favicon.setAttribute("type", "image/x-icon");

    if (window.__settings.app.favicon_full) {
        favicon.setAttribute("href", window.__settings.app.favicon_full);
    } else {
        favicon.setAttribute("href", "../images/default_favicon.png");
    }

    document.head.appendChild(favicon);

}]);


