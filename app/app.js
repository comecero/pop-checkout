var app = angular.module("checkout", ['ngRoute', 'ngSanitize', 'ui.bootstrap', 'angular-loading-bar', 'gettext', 'duScroll', 'ngAnimate']);

app.config(['$httpProvider', '$routeProvider', '$locationProvider', '$provide', 'cfpLoadingBarProvider', function ($httpProvider, $routeProvider, $locationProvider, $provide, cfpLoadingBarProvider) {

    // Define routes
    $routeProvider.when("/", { templateUrl: "app/pages/index/index.html", reloadOnSearch: false });
    $routeProvider.when("/simple", { templateUrl: "app/pages/simple/simple.html", reloadOnSearch: false });
    $routeProvider.when("/simple-receipt/:id", { templateUrl: "app/pages/simple_receipt.html", reloadOnSearch: false });
    $routeProvider.when("/payment/review/:id", { templateUrl: "app/pages/review/review.html" });

    // Non-handled routes.
    var notFoundUrl = window.__settings.app.not_found_url;

    if (notFoundUrl == null) {
        notFoundUrl = window.__settings.app.main_shopping_url;
    }

    if (notFoundUrl == null) {
        // The root of the app
        notFoundUrl = window.location.href.substring(0, window.location.href.indexOf("#")) + "#/";
    }

    $routeProvider.otherwise({
        redirectTo: function () {
            window.location.replace(notFoundUrl);
        }
    });

    // Loading bar https://github.com/chieffancypants/angular-loading-bar A global loading bar when HTTP requests are being made so you don't have to manually trigger spinners on each ajax call.
    cfpLoadingBarProvider.latencyThreshold = 300;
    cfpLoadingBarProvider.includeSpinner = false;

}]);

// Bootstrap settings
app.run(['$rootScope', 'SettingsService', function ($rootScope, SettingsService) {

    // This defines the languages supported by the app. Each supported language must have an associated translation file in the languages folder. It ain't magic.

    var settings = SettingsService.get();

    if (settings.app.enable_languages) {
        $rootScope.languages = [
            {
                code: "en",
                name: "English"
            },
            {
                code: "fr",
                name: "français"
            },
            {
                code: "es",
                name: "Español"
            },
            {
                code: "ru",
                name: "русский"
            }
        ]
    }

}]);


