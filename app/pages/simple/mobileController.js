app.controller("SimpleMobileController", ['$scope', 'CartService', 'GeoService', 'CurrencyService', 'SettingsService', 'HelperService', 'LanguageService', '$uibModal', '$timeout', 'gettextCatalog', '$location', '$document', function ($scope, CartService, GeoService, CurrencyService, SettingsService, HelperService, LanguageService, $uibModal, $timeout, gettextCatalog, $location, $document) {

    // Define a place to hold your data
    $scope.data = {};

    // Load in some helpers
    $scope.geoService = GeoService;
    $scope.settings = SettingsService.get();
    $scope.helpers = HelperService;
    $scope.options = { showSpinner: false, showModal: false };
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
            "success_url": window.location.href.substring(0, window.location.href.indexOf("#")) + "#/simple-m/review/{{payment_id}}",
            "cancel_url": SettingsService.get().app.main_shopping_url || localStorage.getItem("parent_url")
        }
    }

    // Start the spinner
    showSpinner();

    // Set the language, if provided as a query parameter
    var language = $location.search().language;
    if (language) {
        LanguageService.setLanguage(language);
    }

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

    // Update the cart. There might not be a cart at this point; if not, the CartService.update process will create and return a new cart for the user.
    CartService.update(cart, $scope.data.params).then(function (cart) {

        // Set the scope on the cart.
        $scope.data.cart = cart;

        // We wait to show the modal until things have settled.
        hideSpinner();
        $scope.options.showModal = true;

        // Send the cart to the parent window
        sendMessage({ type: "on_load", cart: cart }, $scope.settings.app.allowed_origin_hosts);

        // If there are no payment methods available for this particular situation, show an error
        if (cart.options.payment_methods.length == 0) {
            $scope.data.error = { message: "No payment methods are available for the selected currency." };
        }

    }, function (error) {
        // Error updating the cart
        $scope.data.error = error;
    });

    // Handle a successful payment
    $scope.onPaymentSuccess = function (payment) {

        // Handle the payment response, depending on the type.
        switch (payment.payment_method.type) {

            case "paypal":
                // Redirect to PayPal to make the payment.
                window.location = payment.response_data.redirect_url;
                break;

            default:
                // Show the receipt.
                $scope.data.payment = payment;

                // Scroll to top
                $document.scrollTop(0, 500);

                // Load the conversion
                if (window.__conversion && window.__conversion.recordConversion) {
                    window.__conversion.recordConversion(payment.order.order_id);
                }
        }

    }

    function showSpinner() {
        $scope.spinnerTimeout = $timeout(function () {
            $scope.options.showSpinner = true;
        }, 300);
    }

    function hideSpinner() {
        $scope.options.showSpinner = false;
        $timeout.cancel($scope.spinnerTimeout);
    }

    var onClose = function () {
        // Send a close event to the parent.
        sendMessage({ type: "close", cart: $scope.data.cart }, $scope.settings.app.allowed_origin_hosts);
    }

    $scope.close = function () {
        window.close();
    }

    // Handle if the user closes the tab directly.
    window.onbeforeunload = function () {
        onClose();
    }

    // Watch for error to be populated, and if so, scroll to it.
    $scope.$watch("data.error", function (newVal, oldVal) {
        if ($scope.data.error) {
            $document.scrollTop(0, 500);
        }
    });

}]);