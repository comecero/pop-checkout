/*
Comecero Popup Cart version: ﻿1.0
https://comecero.com
https://github.com/comecero/cart
Copyright Comecero and other contributors. Released under MIT license. See LICENSE for details.
*/

var _popup = (function () {

    // Define variables to hold values that we'll set after we create our hidden iframe.
    var iframe, iframeElem, iframeOrigin, src, appPath;

    // A function for sending messages to the child iframe
    var sendMessage = function (message) {

        // Only send the message if the iFrame origin belongs to an allowed host
        var errorMsg = "This app is not properly configured to run from this website. To enable the payment window to launch from this website, you must supply the website hostname as an allowed origin in the app settings.";
        errorMsg += "\n\nTo configure the payment window to run from this website, sign in to your account, navigate to Apps, go to the settings for the app and add " + window.location.hostname + " to the list of allowed websites.";
        var settings = window.__settings || {};

        // Always allow locahost as a valid origin host, and also allow if the origin host is the same as the page host.
        if (window.location.hostname != "localhost" && window.location.hostname != "127.0.0.1" && (window.location.protocol + "//" + window.location.hostname != iframeOrigin)) {
            if (!settings.app || !settings.app.allowed_origin_hosts) {
                alert(errorMsg);
                close();
                return;
            }

            // The hosts are delimited by space, comma or newline.
            var validHosts = settings.app.allowed_origin_hosts.split(/[\n\s,]+/);
            if (validHosts.indexOf(window.location.hostname) == -1) {
                alert(errorMsg);
                close();
                return;
            }
        }

        iframe.postMessage(JSON.stringify(message), iframeOrigin);
    }

    // Add a listener to receive messages from the child iframe
    window.addEventListener("message", function (message) {

        if (message.data) {

            // Ignore messages that aren't from the iframe origin
            if (message.origin != iframeOrigin) {
                console.log("Attempting to receive a message from the iframe window that is not hosted by an allowed hostname: The hostname " + originHost + " is not listed as approved in the app settings. The message will be ignored.");
                return;
            }

            // message.data contains a serialized object. Parse it so you can examine.
            var obj = JSON.parse(message.data);

            // Examine the message and respond as necessary.
            if (obj.type == "close") {
                close(obj.cart);
            }

            if (obj.type == "on_load" && _popup.onLoad) {
                _popup.onLoad(obj.cart);
            }

            if (obj.type == "redirect") {
                window.location = obj.url;
            }

        }

    });

    var open = function (cart) {

        // Show the iframe
        iframeElem.style.display = "block";

        // Send a message to the iframe
        sendMessage({ type: "add_to_cart", cart: JSON.stringify(cart) });

        // Tell the iframe the URL that generated the popup.
        sendMessage({ type: "set_parent_url", url: window.location.href });

    }

    var close = function (cart) {
        // Hide the iframe

        setTimeout(function () {
            document.getElementById("_popup_iframe").style.display = "none";
        }, 250);

        if (_popup.onClose) {
            _popup.onClose(cart);
        }
    }

    var createCartJsonFromAttributes = function (elem) {

        var cart = {};
        
        // If data-cart is provided, parse the json contents and set it to cart.
        var cartJson = elem.getAttribute("data-cart");
        if (cartJson) {
            try {
                cart = JSON.parse(cartJson);
            } catch (err) {
                // An error occured parsing the JSON. Write to the console.
                console.log("The value of data-cart in the popup button must contain valid JSON. Attempting to parse the value supplied resulted in an error: " + err);
            }

            return cart;
        }

        for (var i = 0, attributes = elem.attributes, n = attributes.length, arr = []; i < n; i++) {
            if (attributes[i].nodeName.length >= 5 && attributes[i].nodeName.substring(0, 5) == "data-") {

                // Get the value of the attribute
                var value = elem.getAttribute(attributes[i].nodeName);

                // Get the name without the data- prefix.
                var prop = attributes[i].nodeName.replace("data-", "");

                // Handle meta
                if (prop.substring(0, 5) == "meta-") {
                    // The property name is whatever comes after meta-
                    var name = prop.substring(5);
                    cart.meta = cart.meta || {};
                    cart.meta[name] = value;
                }

                    // Handle customer info
                else if (prop == "name" || prop == "email") {
                    cart.customer = cart.customer || {};
                    cart.customer[prop] = value;
                }

                    // Handle product info
                else if (prop == "product_id") {
                    cart.items = cart.items || [{}];
                    cart.items[0].product_id = value;
                }

                else if (prop == "quantity") {
                    cart.items = cart.items || [{}];
                    cart.items[0].quantity = value || 1;
                }

                else {
                    // Anything else, just drop it onto the cart
                    cart[prop] = value;
                }

            }
        }

        return cart;

    }

    var appendScript = function(url, success) {

        var script = document.createElement('script');
        script.src = url;

        var head = document.getElementsByTagName('head')[0],
        done = false;

        // Attach handlers for all browsers
        script.onload = script.onreadystatechange = function () {

            if (!done && (!this.readyState || this.readyState == 'loaded' || this.readyState == 'complete')) {

                done = true;

                // callback function provided as param
                if (success) {
                    success();
                }

                script.onload = script.onreadystatechange = null;
                head.removeChild(script);

            };

        };

        head.appendChild(script);

    };

    // This loads the iframe as a hidden element on the page.
    var initialize = function () {

        // Get the element that loaded the script
        var script = document.getElementById("_popup_script");

        if (script) {

            // Define the local and remote origins and scriptPaths
            src = script.getAttribute("src");

            // Define the iframe origin
            var i = -1, x = 3; // We're looking for the 3rd instance of / in the src, which will signify the end of the origin
            while (x-- && i++ < src.length) {
                i = src.indexOf("/", i);
                if (i < 0) break;
            }
            iframeOrigin = src.substring(0, i);

            // If a fully qualified URL. The app path is the src + the first directory
            if (src.substring(0, 8) == "https://" || src.substring(0, 8) == "http://") {
                appPath = src.substring(0, src.split("/", 4).join("/").length);
            } else {
                appPath = src.substring(0, src.split("/", 1).join("/").length);
                // Relative URL so the iframe origin is the current hostname
                iframeOrigin = window.location.protocol + "//" + window.location.hostname;
            }

            // Load the app settings to determine allowed origins for the iframe.
            appendScript(appPath + "/settings/app.js");

            // Set the type of iframe to invoke. The default is "simple" if not provided.
            var type = script.getAttribute("data-popup-type") || "simple";

            iframeElem = document.createElement('iframe')
            iframeElem.src = appPath + '/#/' + type;
            iframeElem.setAttribute("id", "_popup_iframe");
            iframeElem.setAttribute("frameborder", 0);
            iframeElem.setAttribute("scrolling", "no");
            iframeElem.setAttribute("allowtransparency", true);
            iframeElem.setAttribute("sandbox", "allow-scripts allow-forms allow-same-origin allow-popups");

            // You can feed these in as a single string for most browsers but not IE (maybe others), so we'll load styles as an object.
            iframeElem.style["display"] = "none";
            iframeElem.style["z-index"] = 2147483647;
            iframeElem.style["background"] = "rgba(0, 0, 0, 0.004)";
            iframeElem.style["border"] = "0px none transparent";
            iframeElem.style["overflow-x"] = "hidden";
            iframeElem.style["overflow-y"] = "auto";
            iframeElem.style["visibility"] = "visible";
            iframeElem.style["margin"] = "0px";
            iframeElem.style["padding"] = "0px";
            iframeElem.style["-webkit-tap-highlight-color"] = "transparent";
            iframeElem.style["position"] = "fixed";
            iframeElem.style["left"] = "0px";
            iframeElem.style["top"] = "0px";
            iframeElem.style["width"] = "100%";
            iframeElem.style["height"] = "100%";

            var appendIframe = function () {

                // Append to the body
                document.body.appendChild(iframeElem);

                // Get the content window from the appended iframe
                iframe = document.getElementById("_popup_iframe").contentWindow;

                // Set listeners for clicks that should launch the iframe.
                var clickables = document.getElementsByClassName("popup-buy-now");

                for (var i = 0; i < clickables.length; i++) {
                    clickables[i].addEventListener('click', function (event) {

                        // Prevent any other native actions bound to this element.
                        event.preventDefault();

                        // Send a message to the iframe
                        open(createCartJsonFromAttributes(event.target));

                    });
                }
            }

            // Append to the body when ready
            var interval = setInterval(function () {
                if (document.body) {
                    appendIframe();
                    clearInterval(interval);
                }
            }, 20);

        } else {
            console.warn("The script tag that loads popup.js must contain the attribute id=\"_popup_script\"");
        }

    };

    return {
        // Define a public API
        initialize: initialize,
        open: open,
        close: close
    };

})();

_popup.initialize();