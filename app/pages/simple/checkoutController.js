app.controller("CheckoutController", ['$scope', 'CartService', 'GeoService', 'CurrencyService', 'SettingsService', 'HelperService', 'PaymentService', 'LanguageService', 'StorageService', '$uibModal', '$timeout', 'gettextCatalog', '$location', '$document', '$routeParams', function ($scope, CartService, GeoService, CurrencyService, SettingsService, HelperService, PaymentService, LanguageService, StorageService, $uibModal, $timeout, gettextCatalog, $location, $document, $routeParams) {

    // Determine if you are running as a modal
    var asModal = $scope.$resolve.asModal;

    // Define a place to hold your data
    $scope.data = {};

    // Load in the default payment method
    $scope.data.showSection = "payment"; // payment, review, receipt

    // Load in some helpers
    $scope.geoService = GeoService;
    $scope.settings = SettingsService.get();
    $scope.helpers = HelperService;
    $scope.options = { showSpinner: false, showForm: false, payment_method: "credit_card" };
    $scope.paymentParams = { expand: "payment_method.data,order.customer,order.items.product.images,order.items.subscription,cart.options,cart.items.subscription_terms,cart.items.product.images" };

    // Set the cart parameters
    $scope.data.params = {};
    $scope.data.params.expand = "items.product,items.subscription_terms,customer.payment_methods,options";
    $scope.data.params.hide = "items.product.formatted,items.product.prices,items.product.url,items.product.description,items.product.images.link_small,items.product.images.link_medium,items.product.images.link_large,items.product.images.link,items.product.images.filename,items.product.images.formatted,items.product.images.url,items.product.images.date_created,items.product.images.date_modified";

    // Set default values.
    $scope.data.payment_method = {}; // Will be populated from the user's input into the form.
    $scope.data.header_image = $scope.settings.app.logo_popup_square || "images/default_popup_icon.png";
    $scope.data.order = null;

    // Build your payment method models
    $scope.data.card = { "type": "credit_card" };
    $scope.data.amazon_pay = { "type": "amazon_pay" };
    $scope.data.paypal = {
        "type": "paypal",
        data: {
            // The following tokens are allowed in the URL: {{payment_id}}, {{order_id}}, {{customer_id}}, {{invoice_id}}. The tokens will be replaced with the actual values upon redirect.
            "success_url": window.location.href.substring(0, window.location.href.indexOf("#")) + "#/" + "simple/review/{{payment_id}}",
            "cancel_url": SettingsService.get().app.main_shopping_url || localStorage.getItem("parent_url") || window.location.href
        }
    }

    $scope.showSpinner = function (delay) {
        if (!delay) delay = 0;
        $scope.options.showForm = false;
        $scope.spinnerTimeout = $timeout(function () {
            $scope.options.showSpinner = true;
        }, delay);
    }

    $scope.hideSpinner = function () {
        $scope.options.showForm = true;
        $scope.options.showSpinner = false;
        if ($scope.spinnerTimeout)
            $timeout.cancel($scope.spinnerTimeout);
    }

    // Set the language if supplied by an explicit parameter
    setLanguage($location.search());

    // If returning to the page from an external such as PayPal, the payment_id will be in the URL.
    var payment_id = $routeParams.id;

    if (payment_id) {

        // This is a return from an external page such as PayPal. Get the payment.
        PaymentService.get(payment_id, $scope.paymentParams).then(function (payment) {

            $scope.data.payment = payment;
            $scope.data.cart = payment.cart;

            // Override the header image, as necessary.
            if ($scope.settings.app.use_product_icon && payment.cart.items[0].product.images[0]) {
                $scope.data.header_image = payment.cart.items[0].product.images[0].link_square;
            }

            // Check if the payment is already done. The status could be completed (captured) or pending (completed but not yet captured).
            if (payment.status == "completed" || payment.status == "pending") {
                $scope.data.showSection = "receipt";
            } else {
                $scope.data.showSection = "review";
            }

            openPop(asModal);

        }, function (error) {
            $scope.data.error = error;
            openPop(asModal);
        });

    } else {

        // Get the cart from the query parameters
        var cart = $location.search().cart;
        if (cart) {
            cart = JSON.parse(cart);
            $location.search("cart", null);
        } else {
            // Fallback to traditional cart input parameters, useful for manual testing.
            cart = CartService.fromParams({}, $location);
        }

        // If new tab (mobile), run the setCart function on load.
        if (!asModal) {
            $scope.showSpinner(350);
            setCart(cart);
        }
    }

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
            $scope.hideSpinner();

            // Show the checkout form
            openPop(asModal);

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
            $scope.hideSpinner();

            // Open the form
            openPop(asModal);
        });
    }
    
    function openPop(asModal) {

        // This is run when the iframe / tab is first launched.
        $scope.options.showForm = true;

        if (asModal) {
            // Launch the modal. If you enable ESC support (keyboard: true) you will get a double onClose event unless you refactor how close is handled.
            $scope.modalInstance = $uibModal.open({
                templateUrl: 'app/pages/simple/checkout.html',
                backdrop: false,
                keyboard: false,
                scope: $scope
            });

            function clearModal() {
                $timeout(function () {
                    // Reset the payment method. We don't want sensitive payment details to be persisted after the modal is closed.
                    $scope.selectNewPaymentMethod(true);
                    // Clear any errors
                    $scope.data.error = null;
                }, 500);
            }

            $scope.modalInstance.result.then(function () { clearModal() }, function () { clearModal() });

            // We load a pageview when the modal opens so that we don't count pageviews for background loads.
            if (window.__pageview && window.__pageview.recordPageLoad) {
                window.__pageview.recordPageLoad();
            }
        }
    }

    // Handle a successful payment
    $scope.onPaymentSuccess = function (payment) {

        $scope.data.payment = payment;

        // Update the cart to the latest
        $scope.data.cart = payment.cart;

        // If the payment is completed or pending, show the receipt. A payment that is pending is complete, it is just awaiting capture. For the user, there is no difference.
        if (payment.status == "completed" || payment.status == "pending") {

            $scope.data.showSection = "receipt";

            // Scroll to the top of the page.
            scrollTop(asModal);

            // Log out of wallets
            if (!$scope.settings.app.keep_wallet_session) {
                logoutWallet();
            }

            // Load the conversion
            if (window.__conversion && window.__conversion.recordConversion) {
                window.__conversion.recordConversion(payment.order.order_id);
            }

        } else {

            // Handle follow-on steps, according to the payment method.
            switch (payment.payment_method.type) {

                case "paypal":
                    $scope.redirect(payment.response_data.redirect_url);
                    break;

                case "amazon_pay":
                    $scope.data.showSection = "review";
                    break;
            }
        }
    }

    $scope.close = function () {

        // Unregister the onbeforeunload event so you don't get a feedback loop.
        window.onbeforeunload = null;

        // If scope.data.payment, then they are closing a successful payment. Set the payment to null so any future load will not show the receipt. Reset the order to null.
        if ($scope.data.payment && ($scope.data.payment.status == "completed" || $scope.data.payment.status == "pending")) {
            $scope.data.payment = null;
            StorageService.remove("cart_id");
        }

        // Send a close event to the parent.
        sendMessage({ type: "close", cart: $scope.data.cart, order: $scope.data.order }, $scope.settings.app.allowed_origin_hosts);

        // If a modal, close it
        if ($scope.modalInstance) {
            $scope.modalInstance.close();
        } else {
            // Otherwise, close the new tab
            if (window.opener != null) {
                window.close();
            } else {
                // We are in a window that we did not open. This can happen when starting in a modal but ending up on the PayPal review page. Redirect to the main shopping URL.
                var url = localStorage.getItem("parent_url") || SettingsService.get().app.main_shopping_url;
                window.location.href = url;
            }
        }
    }

    $scope.setPaymentMethod = function (paymentMethod) {
        $scope.options.payment_method = paymentMethod;
    }

    $scope.selectNewPaymentMethod = function (keepWalletSession) {

        delete $scope.data.error;
        delete $scope.data.amazon_pay.data;
        $scope.data.card = { "type": "credit_card" };
        $scope.data.exp = null;
        $scope.options.payment_method = "credit_card";

        if (!keepWalletSession) {
            logoutWallet();
        }

        // If the URL contains the payment_id, we are on the dedicated review page. In that case, we will change the URL to re-start the payment. Otherwise, we will just show the payment section.
        if (payment_id) {
            var currentUrl = $location.path().substring(1);
            currentUrl = "/" + currentUrl.substring(0, currentUrl.indexOf("/"));
            $location.path(currentUrl);
        } else {
            $scope.data.showSection = "payment";
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

    $scope.redirect = function redirect(url) {

        // Hide the form, show the spinner.
        $scope.showSpinner();

        // Clear the onbeforeunload event to prevent a "close" event from being sent to the parent during the redirect.
        window.onbeforeunload = null;

        if (asModal) {
            sendMessage({ type: "redirect", url: url }, $scope.settings.app.allowed_origin_hosts);
        } else {
            window.location = url;
        }

    }

    $scope.downloadReceipt = function () {
        ApiService.getItemPdf($scope.data.payment.order.url).then(function (response) {

            var file = new Blob([response.data], { type: "application/pdf" });
            saveAs(file, "Order_" + $scope.data.payment.order.order_id + ".pdf");

        }, function (error) {
            $scope.exception.error = error;
        });
    }

    $scope.showPaymentSelections = function() {
        
        if ($scope.data && $scope.data.amazon_pay && $scope.data.amazon_pay.data)
            return false;

        if ($scope.settings && $scope.settings.account.payment_method_types.length < 2)
            return false;

        if ($scope.data && $scope.data.cart && $scope.data.cart.options.payment_methods.length < 2)
            return false;

        return true;
    }

    function logoutWallet() {
        amazonPay.logout();
    }

    $scope.showCurrencies = function () {
        // Only show on the payment page, and not if Amazon Pay has been selected.
        if ($scope.data.showSection == 'payment' && !$scope.data.amazon_pay.data) {
            return true;
        }
        return false;
    }

    // Select the default payment method
    $scope.$watch("data.cart.options.payment_methods", function (newVal, oldVal) {
        if (newVal && newVal != oldVal) {
            $scope.options.payment_method = getDefaultPaymentMethodType(newVal);
        }
    }, true);

    function getDefaultPaymentMethodType(paymentMethods) {

        // Provide options.payment_methods object as the paymentMethods parameter in this function.

        // If you don't have what you are expecting, return null.
        if (!paymentMethods || paymentMethods.length == 0 || !paymentMethods[0].payment_method_type)
            return null;

        // Returned in order of priority.
        if (_.findWhere(paymentMethods, { "payment_method_type": "credit_card" }) != null)
            return "credit_card";

        if (_.findWhere(paymentMethods, { "payment_method_type": "paypal" }) != null)
            return "paypal";

        if (_.findWhere(paymentMethods, { "payment_method_type": "amazon_pay" }) != null)
            return "amazon_pay";

        // Select the first optino as a catch-all
        return paymentMethods[0].payment_method_type;
    }

    // Watch for error to be populated, and if so, scroll to it.
    $scope.$watch("data.error", function (newVal, oldVal) {
        if ($scope.data.error) {
            scrollTop(asModal);
        }
    });

    // If iframe modal (desktop), handle targeted messages from the parent window.
    $scope.$on("messageReceived", function (event, data) {
        // Examine the message and respond as necessary.
        if (data.type == "add_to_cart" && data.cart) {
            $scope.showSpinner(350);
            setCart(JSON.parse(data.cart));
        }
    });

}]);