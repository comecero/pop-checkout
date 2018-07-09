/*
Comecero Popup Cart version: ﻿1.0.5
https://comecero.com
https://github.com/comecero/cart
Copyright Comecero and other contributors. Released under MIT license. See LICENSE for details.
*/

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
app.controller("IndexController", ['$scope', 'ApiService', 'SettingsService', function ($scope, ApiService, SettingsService) {

    window.location = "getting-started";

}]);
app.controller("CheckoutController", ['$scope', 'CartService', 'GeoService', 'CurrencyService', 'SettingsService', 'HelperService', 'LanguageService', '$uibModal', '$timeout', 'gettextCatalog', '$location', '$document', '$routeParams', function ($scope, CartService, GeoService, CurrencyService, SettingsService, HelperService, LanguageService, $uibModal, $timeout, gettextCatalog, $location, $document, $routeParams) {

    // Determine if you are running as a modal
    var asModal = $scope.$resolve.asModal;

    // Define a place to hold your data
    $scope.data = {};

    // Load in some helpers
    $scope.geoService = GeoService;
    $scope.settings = SettingsService.get();
    $scope.helpers = HelperService;
    $scope.options = { showSpinner: false, showForm: false };
    $scope.paymentParams = { expand: "payment_method,payment_method.data,order.customer,order.items.product,order.items.subscription,order.options,cart.options,invoice.options", show: "payment_method.*,payment_method.data.*,date_created,order.order_id,order.subtotal,order.total,order.tax,order.discount,order.currency,order.customer.name,order.tax_inclusive,order.customer.customer_id,order.customer.email,order.customer.username,order.customer.billing_address.*,order.items.item_id,order.items.quantity,order.items.price,order.items.price_original,order.items.subtotal,order.items.subtotal_original,order.items.total,order.items.total_original,order.items.name,order.items.subscription.description,order.shipping_item.quantity,order.shipping_item.name,order.shipping_item.price,order.shipping_item.price_original,order.shipping_item.subtotal,order.shipping_item.subtotal_original,order.shipping_item.total,order.shipping_item.total_original,order.items.product.images.link_square,order.options.customer_optional_fields,order,cart.options.*,invoice.options.customer_optional_fields" };

    // Set the cart parameters
    $scope.data.params = {};
    $scope.data.params.expand = "items.product,items.subscription_terms,customer.payment_methods,options";
    $scope.data.params.hide = "items.product.formatted,items.product.prices,items.product.url,items.product.description,items.product.images.link_small,items.product.images.link_medium,items.product.images.link_large,items.product.images.link,items.product.images.filename,items.product.images.formatted,items.product.images.url,items.product.images.date_created,items.product.images.date_modified";

    // Set default values.
    $scope.data.payment_method = {}; // Will be populated from the user's input into the form.
    $scope.data.header_image = $scope.settings.app.logo_popup_square || "images/default_popup_icon.png";

    // Build your payment method models
    $scope.data.card = { "type": "credit_card" };

    $scope.data.paypal = {
        "type": "paypal",
        data: {
            // The following tokens are allowed in the URL: {{payment_id}}, {{order_id}}, {{customer_id}}, {{invoice_id}}. The tokens will be replaced with the actual values upon redirect.
            "success_url": window.location.href.substring(0, window.location.href.indexOf("#")) + "#/" + "simple/review/{{payment_id}}",
            "cancel_url": SettingsService.get().app.main_shopping_url || localStorage.getItem("parent_url")
        }
    }

    // Set the language if supplied by an explicit parameter
    setLanguage($location.search());

    // Load the pageview.
    if (window.__pageview && window.__pageview.recordPageLoad) {
        window.__pageview.recordPageLoad();
    }

    // Get the cart from the query parameters
    var cart = $location.search().cart;
    if (cart) {
        cart = JSON.parse(cart);
        $location.search("cart", null);
    } else {
        // Fallback to traditional cart input parameters, useful for manual testing.
        cart = CartService.fromParams({}, $location);
    }

    // If iframe modal (desktop), handle targeted messages from the parent window.
    $scope.$on("messageReceived", function (event, data) {
        // Examine the message and respond as necessary.
        if (data.type = "add_to_cart" && data.cart) {
            showSpinner();
            setCart(JSON.parse(data.cart));
        }
    });

    // If new tab (mobile), run the setCart function on load.
    if (!asModal) {
        showSpinner();
        setCart(cart);
    }

    // A function to create the cart
    function setCart(cart) {

        // Update the cart. There might not be a cart at this point; if not, the CartService.update process will create and return a new cart for the user.
        CartService.update(cart, $scope.data.params, true).then(function (cart) {

            // Set the scope on the cart.
            $scope.data.cart = cart;

            // Hide or cancel showing the spinner
            hideSpinner();

            // Show the checkout form
            showForm(asModal);

            // Override the header image, as necessary.
            if ($scope.settings.app.use_product_icon && cart.items[0].product.images[0]) {
                $scope.data.header_image = cart.items[0].product.images[0].link_square;
            }

            // Send the cart to the parent window
            sendMessage({ type: "on_load", cart: cart }, $scope.settings.app.allowed_origin_hosts);

            // If there are no payment methods available for this particular situation, show an error
            if (cart.options.payment_methods.length == 0) {
                $scope.data.error = { message: "No payment methods are available for the selected currency." };
            }

        }, function (error) {
            // Error creating / updating the cart
            $scope.data.error = error;

            // Hide or cancel showing the spinner
            hideSpinner();

            // Open the form
            showForm(asModal);
        });
    }

    // Show the form, either by modal launch or unhiding if mobile and launched in a new tab.
    function showForm(asModal) {

        // We load a pageview when the modal opens so that we don't count pageviews for background loads.
        if (window.__pageview && window.__pageview.recordPageLoad) {
            window.__pageview.recordPageLoad();
        }

        if (asModal) {

            // Launch the modal
            $scope.modalInstance = $uibModal.open({
                templateUrl: 'app/pages/simple/checkout.html',
                backdrop: false,
                scope: $scope
            });

            // Handle with the modal is closed or dismissed
            $scope.modalInstance.result.then(function () {
                onModalClose();
            }, function (error) {
                onModalClose();
            });

        } else {
            // Show the checkout form
            $scope.options.showForm = true;
        }
    }

    // Handle a successful payment
    $scope.onPaymentSuccess = function (payment) {

        // Handle the payment response, depending on the type.
        switch (payment.payment_method.type) {

            case "paypal":
                // Redirect to PayPal to make the payment.
                if (asModal) {
                    sendMessage({ type: "redirect", url: payment.response_data.redirect_url }, $scope.settings.app.allowed_origin_hosts);
                } else {
                    window.location = payment.response_data.redirect_url;
                }
                break;

            default:
                // Show the receipt.
                $scope.data.payment = payment;

                // Scroll to top
                scrollTop(asModal);

                // Load the conversion
                if (window.__conversion && window.__conversion.recordConversion) {
                    window.__conversion.recordConversion(payment.order.order_id);
                }
        }

    }

    function onModalClose() {

        // Remove any payment info
        $scope.data.card = { "type": "credit_card" };
        $scope.data.exp = null;

        // Clear any errors.
        $scope.data.error = null;

        // Send a close event to the parent.
        sendMessage({ type: "close", cart: $scope.data.cart }, $scope.settings.app.allowed_origin_hosts);

        // If scope.data.payment, then they are closing a successful payment. Set the payment to null so any future load will not show the receipt.
        if ($scope.data.payment) {
            $scope.data.payment = null;
        }

    }

    $scope.close = function () {
        // If a modal, close it
        if ($scope.modalInstance) {
            $scope.modalInstance.close();
        } else {
            // Otherwise, close the new tab
            window.close();
        }
    }

    // Handle if the user closes the tab directly.
    window.onbeforeunload = function () {
        if (asModal)
            onModalClose();
    }

    function setLanguage(params) {
        var language = params.language;
        if (language) {
            LanguageService.setLanguage(language);
        }
    }

    function showSpinner() {
        $scope.spinnerTimeout = $timeout(function () {
            $scope.options.showSpinner = true;
        }, 350);
    }

    function hideSpinner() {
        $scope.options.showSpinner = false;
        if ($scope.spinnerTimeout)
            $timeout.cancel($scope.spinnerTimeout);
    }

    function scrollTop(asModal) {

        if (asModal) {
            // Scroll to the top of the modal location
                var elem = document.getElementsByClassName("modal");
                if (elem && elem.length) {
                    elem[0].scrollTop = 0;
                }
        } else {
            // Scroll to the top of the document
            $document.scrollTop(0, 500);
        }

    }

    // Watch for error to be populated, and if so, scroll to it.
    $scope.$watch("data.error", function (newVal, oldVal) {
        if ($scope.data.error) {
            scrollTop(asModal);
        }
    });

}]);
app.controller("ReviewController", ['$scope', '$location', '$routeParams', 'CartService', 'PaymentService', 'SettingsService', 'HelperService', 'GeoService', '$document', '$uibModal', 'ApiService', function ($scope, $location, $routeParams, CartService, PaymentService, SettingsService, HelperService, GeoService, $document, $uibModal, ApiService) {

    // Define a place to hold your data
    $scope.data = {};
    $scope.options = {};

    // Define the payment_id
    $scope.data.payment_id = $routeParams.id;

    // Load in some helpers
    $scope.settings = SettingsService.get();
    $scope.helpers = HelperService;
    $scope.geoService = GeoService;

    $scope.data.header_image = $scope.settings.app.logo_popup_square || "images/default_popup_icon.png";

    // Set the URL for the finish button
    if (SettingsService.get().app.main_shopping_url) {
        $scope.data.return_url = SettingsService.get().app.main_shopping_url;
    } else if (localStorage.getItem("parent_url")) {
        $scope.data.return_url = localStorage.getItem("parent_url");
    }

    // Set the cart parameters
    $scope.data.params = {};

    // The payment will have a cart or an invoice, we don't know which. Expand both and we'll use whatever one comes back as not null.
    $scope.data.params.expand = "cart.items.product,cart.items.subscription_terms,invoice.items.product,invoice.items.subscription_terms,cart.options,invoice.options,order.customer";
    $scope.data.params.hide = "cart.items.product.formatted,cart.items.product.prices,cart.items.product.url,cart.items.product.description,cart.items.product.images.link_small,cart.items.product.images.link_medium,cart.items.product.images.link_large,cart.items.product.images.link,cart.items.product.images.filename,cart.items.product.images.formatted,cart.items.product.images.url,cart.items.product.images.date_created,cart.items.product.images.date_modified,invoice.items.product.formatted,invoice.items.product.prices,invoice.items.product.url,invoice.items.product.description,invoice.items.product.images.link_small,invoice.items.product.images.link_medium,invoice.items.product.images.link_large,invoice.items.product.images.link,invoice.items.product.images.filename,invoice.items.product.images.formatted,invoice.items.product.images.url,invoice.items.product.images.date_created,invoice.items.product.images.date_modified";

    // Set the cart params for your shipping dropdown directive. They are the same as above, but you have to remove the "cart" and "invoice" prefixes. We'll also have a bunch of duplicates after stripping the prefix, so we'll remove them.
    $scope.data.saleParams = { expand: utils.deDuplicateCsv($scope.data.params.expand.replaceAll("cart.", "").replaceAll("invoice.", "")), hide: utils.deDuplicateCsv($scope.data.params.hide.replaceAll("cart.", "").replaceAll("invoice.", "")) };

    PaymentService.get($scope.data.payment_id, $scope.data.params).then(function (payment) {

        if (payment.status == "completed") {
            // The payment was previously completed, show the receipt
            $scope.data.payment = payment;
        }

        // Get the cart or invoice that the payment is associated with
        $scope.data.sale = payment.cart || payment.invoice;
        if (payment.cart) {
            $scope.options.isCartPayment = true;
        }

        // Get the cart or invoice that the payment is associated with
        $scope.data.sale = payment.cart || payment.invoice;

        // Set flags to indicate if we need to request the company name and phone number fields, which happens when they're required and not already populated.
        if (HelperService.isRequiredCustomerField('company_name', $scope.data.sale.options) && $scope.data.sale.customer.company_name == null) {
            $scope.options.showCompanyName = true;
        }

        if (HelperService.isRequiredCustomerField('phone', $scope.data.sale.options) && $scope.data.sale.customer.phone == null) {
            $scope.options.showPhone = true;
        }

    }, function (error) {
        $scope.data.error = error;
    });

    // Handle a successful payment
    $scope.onPaymentSuccess = function (payment) {

        // If the payment comes back with a redirect URL, it means significant changes to the cart have been done that has changed the payment amount significantly enough that the buyer must re-approve the total through PayPal. Redirect.
        if (payment.response_data.redirect_url) {

            // Redirect to the supplied redirect URL.
            window.location.replace(payment.response_data.redirect_url);

        } else {

            // Show the receipt.
            $scope.data.payment = payment;

            // Load the conversion
            if (window.__conversion && window.__conversion.recordConversion) {
                window.__conversion.recordConversion(payment.order.order_id);
            }

        }
    }

    // Watch for error to be populated, and if so, scroll to it.
    $scope.$watch("data.error", function (newVal, oldVal) {
        if ($scope.data.error) {
            $document.scrollTop(0, 500);
        }
    });

    $scope.downloadReceipt = function () {
        ApiService.getItemPdf($scope.data.payment.order.url).then(function (response) {

            var file = new Blob([response.data], { type: "application/pdf" });
            saveAs(file, "Order_" + $scope.data.payment.order.order_id + ".pdf");

        }, function (error) {
            $scope.exception.error = error;
        });
    }

    $scope.close = function () {

        // For mobile devices, the page opened in a new tab. Just close the tab. For desktop, the page is in the same so redirect back to the parent.
        // This same page is resolved with different URLs in the app settings, so you can tell the nature of the page by looking at the path.
        if ($location.path() == "review") {

        } else {
            window.location = $scope.data.return_url;
        }
    }

    // Record a pageview.
    if (window.__pageview && window.__pageview.recordPageLoad) {
        window.__pageview.recordPageLoad();
    }

}]);

//# sourceMappingURL=pages.js.map
