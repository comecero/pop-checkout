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
            "cancel_url": SettingsService.get().app.main_shopping_url || localStorage.getItem("parent_url") || window.location.href
        }
    }

    // Set the language if supplied by an explicit parameter
    setLanguage($location.search());

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

        // If the customer email has been provided and is invalid, remove it.
        if (cart && cart.customer && cart.customer.email && !utils.isValidEmail(cart.customer.email)) {
            delete cart.customer.email;
        }

        // Make a copy of the input so you can determine what information has been provided in advance for use in the view.
        $scope.data.input = angular.copy(cart);

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

            // If an error due to an invalid promotion code, re-run without the promotion code.
            if (error.code) {
                if (error.code == "invalid_promotion_code") {
                    delete cart.promotion_code;
                    setCart(cart);
                    return;
                }
            }

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
                $scope.close();
            }, function (error) {
                $scope.close();
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

    $scope.close = function () {

        // Clear any errors
        $scope.data.error = null;

        // Remove any payment info
        $scope.data.card = { "type": "credit_card" };
        $scope.data.exp = null;

        // Send a close event to the parent.
        sendMessage({ type: "close", cart: $scope.data.cart }, $scope.settings.app.allowed_origin_hosts);

        // If scope.data.payment, then they are closing a successful payment. Set the payment to null so any future load will not show the receipt.
        if ($scope.data.payment) {
            $scope.data.payment = null;
        }

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
        $scope.close();
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