window.__conversion = (function () {
    
    var cookies = {};
    
    function setCookie(name, value, days) {
        if (days) {
            var date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            var expires = "; expires=" + date.toGMTString();
        }
        else var expires = "";
        document.cookie = name + "=" + value + expires + "; path=/; secure;";
    }
    
    function getCookie(name, c, C, i) {
        if (cookies[name]) { return cookies[name]; }
        
        c = document.cookie.split('; ');
        for (i = c.length - 1; i >= 0; i--) {
            C = c[i].split('=');
            cookies[C[0]] = C[1];
        }
        
        return cookies[name];
    }
    
    function isNullOrEmpty(string) {
        if (string == null || string == undefined) {
            return true;
        }
        
        if (string == "") {
            return true;
        }
        
        if (string.replace(/ /g, '') == null) {
            return true;
        }
        
        return false;

    }
    
    function pageQueryParams() {
        
        var url = window.location.href
        
        if (url.indexOf("?") == -1) {
            return {};
        }
        
        q = url.substring(url.indexOf("?") + 1);
        
        // Strip off any hash parameters
        if (q.indexOf("#") > 0) {
            q = q.substring(0, q.indexOf("#"));
        }
        
        var queryParameters = {};
        
        if (isNullOrEmpty(q)) {
            return queryParameters;
        }
        
        var e,
            a = /\+/g,  // Regex for replacing addition symbol with a space
            r = /([^&;=]+)=?([^&;]*)/g,
            d = function (s) { return decodeURIComponent(s.replace(a, " ")); }
        var queryParameters = {};
        
        while (e = r.exec(q))
            queryParameters[d(e[1])] = d(e[2]);
        
        return queryParameters;

    }

    function getAttributeValue(elementId, attribute) {

        // Check for an element with the id of __pageview
        var elem = document.getElementById(elementId);
        if (elem) {
            // Check if it has the attribute data-manual-record.
            var attr = elem.getAttribute(attribute);
            return attr || null;
        }
        return null;
    }

    function recordConversion(id) {

        // Find the order_id. It's either provided as a parameter, in the data-order_id attribute, as the order_id query string parameter or in the order_id cookie.
        var order_id = id;

        // If not found, look in the data-order_id attribute.
        if (!order_id) {
            var order_id = getAttributeValue("__conversion", "data-order_id");
        }

        // If not found, look in the query string or cookie.
        if (!order_id) {
            var order_id = pageQueryParams()["order_id"] || getCookie("order_id");
        }

        // The conversion code will only run if an order_id was located.
        if (order_id) {

            // See if we've already recorded this conversion. If so, exit now.
            if (getCookie("conv-" + order_id)) {
                return;
            }

            var request = new XMLHttpRequest();
            request.withCredentials = true;
            request.open('GET', "/api/v1/orders/" + order_id + "?expand=payment.payment_method,customer", true);
            request.setRequestHeader("Authorization", "Bearer " + getCookie("token"));

            request.onreadystatechange = function () {
                if (this.readyState === 4) {
                    if (this.status >= 200 && this.status < 300) {

                        var data = JSON.parse(this.responseText);

                        // Set variables so the client custom code has access to certain objects
                        var order = data;
                        var payment = order.payment;
                        var customer = order.customer;

                        // Set a cookie to indicate that we've recorded this conversion so we don't repeat it on page refresh.
                        setCookie("conv-" + order_id, true, 10);

                        console.log("If this app was running in the hosted environment, a conversion would have been recorded. In development, no conversion calls are performed.");
                        console.log(order);

                    }
                }
            };

            request.send();
            request = null;

        }

    }

    function manualRecord() {

        // Check for an element with the id of __pageview
        var elem = document.getElementById("__conversion");
        if (elem) {
            // Check if it has the attribute data-manual-record.
            var attrs = elem.attributes;
            if (attrs["data-manual-record"]) {
                return true;
            }
        }
        return false;
    }
    
    return {
        recordConversion: recordConversion,
        manualRecord: manualRecord
    };

})();

// A conversion can be recorded implicitly by page load or explicitly by function call.

// The function requires the order_id to be provided to it in order to properly record the conversion. The order_id can be provided in a variety of ways:
// For implicit calls, the system will look for order_id in the script's data-order_id attribute, order_id as a query string parameter, then to order_id in a cookie.
// For explicit calls, the order_id is provided as a paramter in the recordConversion function.

// In typical applications where the order_id is provided in the data-order_id attribute, query string or cookie, you simply embed the analytics script on the receipt / confirmation page.
// For example, if order_id is provided by query string or cookie: <script src="analytics/conversion.js"></script>
// For example, if order_id is provided by data-order_id attribute: <script id="__conversion" data-order_id="ABCD-1234-EFG" src="analytics/conversion.js"></script> (Note in this example you must provide the id="__conversion" attribute.

// To manually invoke the conversion, you embed the script with an id of __conversion and an attribute of data-manual-record.
// For example: <script id="__conversion" data-manual-record src="analytics/conversion.js"></script>
// If the id is provided and the attribute data-manual-record is provided, then the script never implicitly records a conversion. Instead, the app manually records the conversion by calling window.__conversion.recordConversion(order_id) when required.

if (!__conversion.manualRecord()) {
    window.__conversion.recordConversion();
}