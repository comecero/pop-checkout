app.controller("GettingStartedController", ['$scope', 'ProductService', '$location', function ($scope, ProductService, $location) {

    $scope.data = {};

    // Set the app URL for the snippet example
    var path = window.location.pathname.substring(1);
    path = path.substring(0, path.indexOf("/"));
    $scope.data.src = window.location.protocol + "//" + window.location.hostname + "/" + path;
    $scope.data.debugUrl = $location.absUrl().split('?')[0] + "?debug=true";

    $scope.data.test = false;

    // Get an active product
    ProductService.getList({ limit: 1, sort_by: "name" }).then(function (products) {

        $scope.data.loaded = true;

        // Set the product_id on the demo button URL
        if (products.data.length > 0) {
            $scope.data.product = products.data[0];
            $scope.data.test = products.data[0].test;
        }

    }, function (error) {
        $scope.data.error = error;
    });

}]);