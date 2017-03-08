var app = angular.module("gettingStarted", ['ngRoute', 'ngSanitize', 'gettext']);

app.config(['$httpProvider', '$routeProvider', '$locationProvider', '$provide', function ($httpProvider, $routeProvider, $locationProvider, $provide) {

    // Define routes
    $routeProvider.when("/", { templateUrl: "../getting-started/index.html", reloadOnSearch: false });

}]);


