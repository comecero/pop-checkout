app.directive('ccExpDate', function () {

    return {
        restrict: 'A',
        scope: {
            date: '=?',
            expMonth: '=?',
            expYear: '=?'
        },
        link: function (scope, elem, attrs) {

            // Credit card expiration formatter
            var isExpInputDelete = false;
            document.addEventListener("keydown", function (event) {
                if (event.which == 8 || event.which == 46) {
                    isExpInputDelete = true;
                } else {
                    isExpInputDelete = false;
                }
            });

            // Pretty-formats the credit card expiration date
            scope.$watch("date", function (newVal, oldVal) {

                if (newVal != oldVal) {

                    if (!newVal) {
                        scope.date = null;
                        return;
                    }

                    if (newVal == "1/") {
                        scope.date = "01 / ";
                        return;
                    }

                    // Check if pressing backspace or delete.
                    if (isExpInputDelete) {
                        if (utils.right(newVal, 2) == " /") {
                            scope.date = utils.left(newVal, newVal.length - 2);
                            return;
                        }
                        scope.date = newVal;
                        return;
                    }

                    // Remove any non-numeric from the string
                    var result = "";
                    if (newVal) {
                        result = newVal.replace(/[^0-9]/g, "");
                    }

                    // If the length is 1 and the character is 2-9, prepend with a 0. When the user first types 2-9, it will be converted to 02 - 09.
                    if (result.length == 1 && /[2-9]/.test(result)) {
                        result = "0".concat(result);
                    }

                    // If the length is 2 and the second character is 3-9, insert a " / " after the second character
                    if (result.length == 2 && /[3-9]/.test(utils.right(result, 1))) {
                        result = result + " / ";
                    }

                    // If the length is 2 characters or more, put a / at position 3 unless oldVal is longer than newVal, which means they're backspacing, or unless the last character are already "/ ".
                    if (result.length >= 2 && utils.right(result, 2) != "/ ") {
                        result = result.substring(0, 2) + " / " + utils.right(result, result.length - 2);
                    }

                    // Dump anything after 9 charaters
                    if (result.length >= 9) {
                        result = utils.left(result, 9);
                    }

                    scope.date = result;

                    // Fill the expiration date on the model with any valid values you have
                    if (result.length >= 2) {
                        scope.expMonth = result.substring(0, 2);
                    }

                    if (result.length >= 7) {
                        scope.expYear = utils.right(result, 2);
                    }

                }

            });

        }
    };
});

app.directive('postalCodePlaceholder', ['gettextCatalog', function (gettextCatalog) {

    return {
        restrict: 'A',
        scope: {
            postalCodePlaceholder: '=?',
            country: '=?'
        },
        link: function (scope, elem, attrs) {

            scope.$watch("country", function (newVal, oldVal) {
                if (newVal == "US") {
                    scope.postalCodePlaceholder = "ZIP";
                } else {
                    scope.postalCodePlaceholder = gettextCatalog.getString("Postal Code");
                }
            });

        }
    };
}]);

app.directive('downloadReceipt', ['ApiService', function (ApiService) {

    return {
        restrict: 'A',
        scope: {
            orderId: '=?',
            orderUrl: '=?',
            error: '=?'
        },
        link: function (scope, elem, attrs) {

            elem.bind("click", function () {
                ApiService.getItemPdf(scope.orderUrl).then(function (response) {
                    var file = new Blob([response.data], { type: "application/pdf" });
                    saveAs(file, "Order_" + scope.orderId + ".pdf");
                }, function (error) {
                    scope.error = error;
                });
            });
        }
    };
}]);


app.directive('insertHtml', function () {
    return {
        restrict: 'AE',
        link: function (scope, element, attrs) {
        },
        templateUrl: function (elem, attrs) {
            return attrs.insertHtml;
        }
    }
});