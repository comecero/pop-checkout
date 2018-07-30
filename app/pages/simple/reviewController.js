app.controller("ReviewController", ['$scope', '$location', '$routeParams', 'CartService', 'PaymentService', 'SettingsService', 'HelperService', 'GeoService', '$document', '$uibModal', 'ApiService', function ($scope, $location, $routeParams, CartService, PaymentService, SettingsService, HelperService, GeoService, $document, $uibModal, ApiService) {

    // Define a place to hold your data
    $scope.data = {};
    $scope.data.order = null;
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

        $scope.data.order = payment.order;

        // If the payment comes back with a redirect URL, it means significant changes to the cart have been done that has changed the payment amount significantly enough that the buyer must re-approve the total through PayPal. Redirect.
        if (payment.response_data.redirect_url) {

            // Clear the onbeforeunload event to prevent a "close" event from being sent to the parent.
            window.onbeforeunload = null;

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
        window.location = $scope.data.return_url;
    }

    // Handle if the user closes the tab directly.
    window.onbeforeunload = function () {
        // Send a close event to the parent.
        sendMessage({ type: "close", cart: $scope.data.sale, order: $scope.data.order }, $scope.settings.app.allowed_origin_hosts);
    }

    // Record a pageview.
    if (window.__pageview && window.__pageview.recordPageLoad) {
        window.__pageview.recordPageLoad();
    }

}]);
