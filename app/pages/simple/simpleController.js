app.controller("PopupController", ['$scope', 'CartService', 'ApiService', 'GeoService', 'CurrencyService', 'SettingsService', 'HelperService', '$uibModal', '$timeout', 'gettextCatalog', function ($scope, CartService, ApiService, GeoService, CurrencyService, SettingsService, HelperService, $uibModal, $timeout, gettextCatalog) {

    // Define a place to hold your data
    $scope.data = {};

    // Load in some helpers
    $scope.geoService = GeoService;
    $scope.settings = SettingsService.get();
    $scope.helpers = HelperService;
    $scope.options = { showSpinner: false };
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
            "success_url": window.location.href.substring(0, window.location.href.indexOf("#")) + "#/payment/review/{{payment_id}}",
            "cancel_url": SettingsService.get().app.main_shopping_url || localStorage.getItem("parent_url")
        }
    }

    // Get the current cart
    var setCart = function (cart) {

        // Show the spinner
        showSpinner();

        // Set an items array if not provided.
        cart.items = cart.items || [{}];

        // If more than one item in the cart remove all but the first.
        if (cart.items.length > 1) {
            cart.items.splice(1);
        }

        // If the product already in the cart is different than the product being supplied, remove all items now to enable the spinners to load while replacing the item.
        if ($scope.data.cart && $scope.data.cart.items && $scope.data.cart.items[0] && $scope.data.cart.items[0].product_id != cart.items[0].product_id)
            $scope.$apply(function () {
                $scope.data.cart.items = null;
            });

        // Update the cart. There might not be a cart at this point; if not, the CartService.update process will create and return a new cart for the user.
        CartService.update(cart, $scope.data.params, true).then(function (cart) {

            // Set the scope on the cart.
            $scope.data.cart = cart;

            // Hide or cancel showing the spinner
            hideSpinner();

            // Open the modal
            openModal();

            // Override the header image, as necessary.
            if ($scope.settings.app.use_product_icon && cart.items[0].product.images[0]) {
                $scope.data.header_image = cart.items[0].product.images[0].link_square;
            }

            // Send the cart to the parent window
            sendMessage({ type: "on_load", cart: cart });

        }, function (error) {
            // Error creating / updating the cart
            $scope.data.error = error;

            // Hide or cancel showing the spinner
            hideSpinner();

            // Open the modal
            openModal();
        });
    }

    // Handle a successful payment
    $scope.onPaymentSuccess = function (payment) {

        // Handle the payment response, depending on the type.
        switch (payment.payment_method.type) {

            case "paypal":
                // Redirect to PayPal to make the payment.
                sendMessage({ type: "redirect", url: payment.response_data.redirect_url });
                break;

            default:
                // Show the receipt.
                $scope.data.payment = payment;

                // Load the conversion
                if (window.__conversion && window.__conversion.recordConversion) {
                    window.__conversion.recordConversion(payment.order.order_id);
                }
        }

    }

    $scope.close = function () {

        // Remove any payment info
        $scope.data.card = { "type": "credit_card" };
        // Clear any errors.
        $scope.data.error = null;

        // Send a close event to the parent.
        sendMessage({ type: "close", cart: $scope.data.cart });

        // Remove the "in" class from the modal, which triggers departure animation
        var elem = document.getElementsByClassName("modal")[0].classList.remove("in");

        // Set a timeout to allow the animation to play.
        $timeout(function () {

            // If scope.data.payment, then they are closing a successful payment. Set the payment to null so any future load will not show the receipt.
            if ($scope.data.payment) {
                $scope.data.payment = null;
            }

            // Close the modal
            $scope.modalInstance.close();

        }, 250)

    }

    $scope.downloadReceipt = function () {
        ApiService.getItemPdf($scope.data.payment.order.url).then(function (response) {

            var file = new Blob([response.data], { type: "application/pdf" });
            saveAs(file, "Order_" + $scope.data.payment.order.order_id + ".pdf");

        }, function (error) {
            $scope.exception.error = error;
        });
    }

    // A function for sending messages to the parent iframe
    var sendMessage = function (message) {

        var errorMsg = "Attempting to send a message to the parent of the iframe window that is not hosted by an allowed hostname: The hostname " + $scope.originHost + " is not listed as approved in the app settings. The message will not be sent.";

        // Always allow locahost as a valid origin host, and also allow if the origin host is the same as the page host.
        if ($scope.originHost != "localhost" && $scope.originHost != "127.0.0.1" && (window.location.hostname != $scope.originHost)) {

            // Only send a message to the page you were invoked from, and if that page is on the list of valid hostnames.
            var validHosts = [];
            if ($scope.settings.app && $scope.settings.app.allowed_origin_hosts) {
                var validHosts = $scope.settings.app.allowed_origin_hosts.split(/[\n\s,]+/);
            }

            if (validHosts.indexOf($scope.originHost) == -1) {
                console.warn(errorMsg);
                return;
            }
        }

        parent.postMessage(JSON.stringify(message), "*");
    }

    var showSpinner = function () {
        $scope.spinnerTimeout = $timeout(function () {
            $scope.options.showSpinner = true;
        }, 300);
    }

    var hideSpinner = function () {
        $timeout.cancel($scope.spinnerTimeout);
        $timeout(function () {
            $scope.options.showSpinner = false;
        }, 300);
    }

    // Listen for messages from the parent that hosts the iframe.
    window.addEventListener("message", function (message) {

        var originHost = message.origin.replace("https://", "").replace("http://", "");
        var errorMsg = "Attempting to receive a message from the parent of the iframe window that is not hosted by an allowed hostname: The hostname " + originHost + " is not listed as approved in the app settings. The message will be ignored.";

        // Always allow locahost as a valid origin host, and also allow if the origin host is the same as the page host.
        if (originHost != "localhost" && originHost != "127.0.0.1" && (window.location.hostname != originHost)) {

            if (!$scope.settings.app || !$scope.settings.app.allowed_origin_hosts) {
                console.log(errorMsg);
                return;
            }

            // The hosts are delimited by space, comma or newline.
            var validHosts = [];
            if ($scope.settings.app && $scope.settings.app.allowed_origin_hosts) {
                var validHosts = $scope.settings.app.allowed_origin_hosts.split(/[\n\s,]+/);
            }

            if (validHosts.indexOf(originHost) == -1) {
                console.log(errorMsg);
                return;
            }
        }

        $scope.originHost = originHost;

        // message.data contains a serialized object. Parse it so you can examine.
        if (message.data) {
            var obj = JSON.parse(message.data);

            // Examine the message and respond as necessary.
            if (obj.type = "add_to_cart" && obj.cart) {
                setCart(JSON.parse(obj.cart));
            }

            if (obj.type = "set_parent_url" && obj.url) {
                localStorage.setItem("parent_url", obj.url);
            }

        }

    });

    // Credit card expiration formatter
    var isExpInputDelete = false;
    document.addEventListener("keydown", function (event) {
        if (event.which == 8 || event.which == 46) {
            isExpInputDelete = true;
        } else {
            isExpInputDelete = false;
        }
    });

    $scope.$watch("data.cart.customer.billing_address.country", function (newVal, oldVal) {
        if (newVal == "US") {
            $scope.data.postalCodePlaceholder = "ZIP"
        } else {
            $scope.data.postalCodePlaceholder = gettextCatalog.getString("Postal Code");
        }
    });

    $scope.$watch("data.card.data.exp", function (newVal, oldVal) {

        if (newVal != oldVal) {

            if (!newVal) {
                if ($scope.data.card.data) {
                    $scope.data.card.data.exp = null;
                }
                return;
            }

            if (newVal == "1/") {
                $scope.data.card.data.exp = "01 / ";
                return;
            }

            // Check if pressing backspace or delete.
            if (isExpInputDelete) {
                if (utils.right(newVal, 2) == " /") {
                    $scope.data.card.data.exp = utils.left(newVal, newVal.length - 2);
                    return;
                }
                $scope.data.card.data.exp = newVal;
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

            $scope.data.card.data.exp = result;

            // Fill the expiration date on the model with any valid values you have
            if (result.length >= 2) {
                $scope.data.card.data.exp_month = result.substring(0, 2);
            }

            if (result.length == 7) {
                $scope.data.card.data.exp_year = utils.right(result, 2);
            }

        }

    });

    var openModal = function () {

        // We load a pageview when the modal opens so that we don't count pageviews for background loads.
        if (window.__pageview && window.__pageview.recordPageLoad) {
            window.__pageview.recordPageLoad();
        }

        $scope.modalInstance = $uibModal.open({
            templateUrl: 'simple.html',
            backdrop: false,
            scope: $scope
        });
    }

}]);