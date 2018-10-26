/*
Comecero Popup Cart version: ﻿1.0.7
https://comecero.com
https://github.com/comecero/cart
Copyright Comecero and other contributors. Released under MIT license. See LICENSE for details.
*/

var _popup = (function () {

    // Define variables to hold values that we'll set after we create our hidden iframe.
    var childElem, iframe, childOrigin, src, appPath, asModal, iframeReady, open, debug;

    // isMobile.js v0.4.1, https://github.com/kaimallea/isMobile
    (function (global) {

        var apple_phone = /iPhone/i,
            apple_ipod = /iPod/i,
            apple_tablet = /iPad/i,
            android_phone = /(?=.*\bAndroid\b)(?=.*\bMobile\b)/i, // Match 'Android' AND 'Mobile'
            android_tablet = /Android/i,
            amazon_phone = /(?=.*\bAndroid\b)(?=.*\bSD4930UR\b)/i,
            amazon_tablet = /(?=.*\bAndroid\b)(?=.*\b(?:KFOT|KFTT|KFJWI|KFJWA|KFSOWI|KFTHWI|KFTHWA|KFAPWI|KFAPWA|KFARWI|KFASWI|KFSAWI|KFSAWA)\b)/i,
            windows_phone = /Windows Phone/i,
            windows_tablet = /(?=.*\bWindows\b)(?=.*\bARM\b)/i, // Match 'Windows' AND 'ARM'
            other_blackberry = /BlackBerry/i,
            other_blackberry_10 = /BB10/i,
            other_opera = /Opera Mini/i,
            other_chrome = /(CriOS|Chrome)(?=.*\bMobile\b)/i,
            other_firefox = /(?=.*\bFirefox\b)(?=.*\bMobile\b)/i, // Match 'Firefox' AND 'Mobile'
            seven_inch = new RegExp(
                '(?:' +         // Non-capturing group

                'Nexus 7' +     // Nexus 7

                '|' +           // OR

                'BNTV250' +     // B&N Nook Tablet 7 inch

                '|' +           // OR

                'Kindle Fire' + // Kindle Fire

                '|' +           // OR

                'Silk' +        // Kindle Fire, Silk Accelerated

                '|' +           // OR

                'GT-P1000' +    // Galaxy Tab 7 inch

                ')',            // End non-capturing group

                'i');           // Case-insensitive matching

        var match = function (regex, userAgent) {
            return regex.test(userAgent);
        };

        var IsMobileClass = function (userAgent) {
            var ua = userAgent || navigator.userAgent;

            // Facebook mobile app's integrated browser adds a bunch of strings that
            // match everything. Strip it out if it exists.
            var tmp = ua.split('[FBAN');
            if (typeof tmp[1] !== 'undefined') {
                ua = tmp[0];
            }

            // Twitter mobile app's integrated browser on iPad adds a "Twitter for
            // iPhone" string. Same probable happens on other tablet platforms.
            // This will confuse detection so strip it out if it exists.
            tmp = ua.split('Twitter');
            if (typeof tmp[1] !== 'undefined') {
                ua = tmp[0];
            }

            this.apple = {
                phone: match(apple_phone, ua),
                ipod: match(apple_ipod, ua),
                tablet: !match(apple_phone, ua) && match(apple_tablet, ua),
                device: match(apple_phone, ua) || match(apple_ipod, ua) || match(apple_tablet, ua)
            };
            this.amazon = {
                phone: match(amazon_phone, ua),
                tablet: !match(amazon_phone, ua) && match(amazon_tablet, ua),
                device: match(amazon_phone, ua) || match(amazon_tablet, ua)
            };
            this.android = {
                phone: match(amazon_phone, ua) || match(android_phone, ua),
                tablet: !match(amazon_phone, ua) && !match(android_phone, ua) && (match(amazon_tablet, ua) || match(android_tablet, ua)),
                device: match(amazon_phone, ua) || match(amazon_tablet, ua) || match(android_phone, ua) || match(android_tablet, ua)
            };
            this.windows = {
                phone: match(windows_phone, ua),
                tablet: match(windows_tablet, ua),
                device: match(windows_phone, ua) || match(windows_tablet, ua)
            };
            this.other = {
                blackberry: match(other_blackberry, ua),
                blackberry10: match(other_blackberry_10, ua),
                opera: match(other_opera, ua),
                firefox: match(other_firefox, ua),
                chrome: match(other_chrome, ua),
                device: match(other_blackberry, ua) || match(other_blackberry_10, ua) || match(other_opera, ua) || match(other_firefox, ua) || match(other_chrome, ua)
            };
            this.seven_inch = match(seven_inch, ua);
            this.any = this.apple.device || this.android.device || this.windows.device || this.other.device || this.seven_inch;

            // excludes 'other' devices and ipods, targeting touchscreen phones
            this.phone = this.apple.phone || this.android.phone || this.windows.phone;

            // excludes 7 inch devices, classifying as phone or tablet is left to the user
            this.tablet = this.apple.tablet || this.android.tablet || this.windows.tablet;

            if (typeof window === 'undefined') {
                return this;
            }
        };

        var instantiate = function () {
            var IM = new IsMobileClass();
            IM.Class = IsMobileClass;
            return IM;
        };

        if (typeof module !== 'undefined' && module.exports && typeof window === 'undefined') {
            //node
            module.exports = IsMobileClass;
        } else if (typeof module !== 'undefined' && module.exports && typeof window !== 'undefined') {
            //browserify
            module.exports = instantiate();
        } else if (typeof define === 'function' && define.amd) {
            //AMD
            define('isMobile', [], global.isMobile = instantiate());
        } else {
            global.isMobile = instantiate();
        }

    })(this);

    // Detect the environment so we can determine if we open in a new tab or modal.
    asModal = !isMobile.phone;

    // A function for sending messages to the child iframe
    var sendMessage = function (message) {

        var settings = window.__settings || {};

        // Only send the message if the iFrame origin belongs to an allowed host
        var errorMsg = "This app is not properly configured to run from this website. To enable the payment window to launch from this website, you must supply the website hostname as an allowed origin in the app settings.";
        errorMsg += "\n\nTo configure the payment window to run from this website, sign in to your account, navigate to Apps, go to the settings for the app and add " + window.location.hostname + " to the list of allowed websites.";

        // Always allow locahost as a valid origin host, and also allow if the origin host is the same as the page host.
        if (window.location.hostname != "localhost" && window.location.hostname != "127.0.0.1" && (window.location.protocol + "//" + window.location.hostname != childOrigin)) {
            if (!settings.app || !settings.app.allowed_origin_hosts) {
                writeDebug("Send message failed. The parent hostname is not listed in allowed_origin_hosts (check 1)", window.location.hostname);
                alert(errorMsg);
                closeIframe();
                return;
            }

            // The hosts are delimited by space, comma or newline.
            var validHosts = settings.app.allowed_origin_hosts.split(/[\n\s,]+/);
            if (validHosts.indexOf(window.location.hostname) == -1) {
                writeDebug("Send message failed. The parent hostname is not listed in allowed_origin_hosts (check 2)", window.location.hostname);
                alert(errorMsg);
                closeIframe();
                return;
            }
        }

        writeDebug("Preparing to send a message", JSON.stringify(message));

        // Don't send the message until the iframe is ready.
        if (iframeReady) {
            writeDebug("The iframe is ready, sending message now.");
            childElem.postMessage(JSON.stringify(message), childOrigin);
        } else {
            var iframeReadyCheckInterval = setInterval(function () {
                writeDebug("Checking to see if the iframe is ready before attempting to send the message.");
                if (iframeReady) {
                    writeDebug("The iframe is ready, sending message now (from interval).");
                    clearInterval(iframeReadyCheckInterval);
                    childElem.postMessage(JSON.stringify(message), childOrigin);
                }
            }, 20);
        }

    }

    // Add a listener to receive messages from the child iframe
    window.addEventListener("message", function (message) {

        if (message.data) {

            writeDebug("Received message from app", JSON.stringify(message));

            // Ignore messages that aren't from the iframe origin
            if (message.origin != childOrigin) {
                console.log("Attempting to receive a message from the child window that is not hosted by an allowed hostname: The hostname " + message.origin + " is not listed as approved in the app settings. The message will be ignored.");
                return;
            }

            // message.data contains a serialized object. Parse it so you can examine.
            var obj = JSON.parse(message.data);

            // Examine the message and respond as necessary.
            if (obj.type == "close") {

                // If we have an iframe, close it
                if (iframe) {
                    writeDebug("Preparing to close the iframe.");
                    closeIframe();
                }

                // Fire the onclose event with the current cart
                if (_popup.onClose) {
                    var data = { cart: obj.cart, order: obj.order };
                    writeDebug("Calling the onClose event.", JSON.stringify(data));
                    _popup.onClose(data);
                }

            }

            if (obj.type == "on_load" && _popup.onLoad) {
                var data = { cart: obj.cart };
                writeDebug("Calling onLoad event.", JSON.stringify(data));
                _popup.onLoad(data);
            }

            if (obj.type == "redirect") {
                writeDebug("The app is requesting the parent page to perform a redirect.", obj.url);
                window.location = obj.url;
            }

            if (obj.type == "ready") {
                writeDebug("The app is indicating that it is ready.");
                iframeReady = true;
            }

        }

    });

    var openIframe = function (cart) {

        writeDebug("Opening the iframe", JSON.stringify(cart));

        // Show the iframe
        iframe.style.display = "block";

        // Send a message to the iframe
        sendMessage({ type: "add_to_cart", cart: JSON.stringify(cart) });

        // Tell the iframe the URL that generated the popup.
        sendMessage({ type: "set_parent_url", url: window.location.href });

    }

    var closeIframe = function () {

        writeDebug("Closing the iframe");

        // Hide the iframe
        setTimeout(function () {
            document.getElementById("_popup_iframe").style.display = "none";
        }, 250);
    }

    var appendAsyncScript = function (url, callback) {

        writeDebug("Adding the app script to the page", url);

        var head = document.getElementsByTagName("head")[0], done = false;
        var script = document.createElement("script");
        script.src = url;
        script.type = "text/javascript";
        script.async = 1;
        // Attach handlers for all browsers
        script.onload = script.onreadystatechange = function () {
            if (!done && (!this.readyState || this.readyState === "loaded" || this.readyState === "complete")) {
                done = true;
                if (typeof callback === 'function') callback();
            }
        };
        head.appendChild(script);

    };

    var createCartJsonFromAttributes = function (elem) {

        writeDebug("Creating the cart from JSON attributes", JSON.stringify(elem));

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

    var getClickables = function (onComplete) {
        
        // Watch for the body to complete loading; when done select the elements that should respond to click events.
        var readyStateCheckInterval = setInterval(function () {
            writeDebug("Preparing to look for clickables, will repeat until the body has finished loading.");
            if (document.readyState === "complete") {
                clearInterval(readyStateCheckInterval);
                var clickables = document.getElementsByClassName("popup-buy-now");
                writeDebug("The clickables have been loaded.");
                onComplete(clickables);
            }
        }, 20);

    }

    // Used when launching in a modal, usually used in desktop and tablet environments
    var addModalListeners = function (target, language) {

        writeDebug("Adding modal listeners", target);

        // First, append the iframe to the document.
        iframe = document.createElement('iframe')
        iframe.src = target;

        if (language)
            iframe.src += "?language=" + language;

        iframe.setAttribute("id", "_popup_iframe");
        iframe.setAttribute("frameborder", 0);
        iframe.setAttribute("scrolling", "no");
        iframe.setAttribute("allowtransparency", true);
        iframe.setAttribute("sandbox", "allow-scripts allow-forms allow-same-origin allow-popups");

        // You can feed these in as a single string for most browsers but not IE (maybe others), so we'll load styles as an object.
        iframe.style["display"] = "none";
        iframe.style["z-index"] = 2147483647;
        iframe.style["background"] = "rgba(0, 0, 0, 0.004)";
        iframe.style["border"] = "0px none transparent";
        iframe.style["overflow-x"] = "hidden";
        iframe.style["overflow-y"] = "auto";
        iframe.style["visibility"] = "visible";
        iframe.style["margin"] = "0px";
        iframe.style["padding"] = "0px";
        iframe.style["-webkit-tap-highlight-color"] = "transparent";
        iframe.style["position"] = "fixed";
        iframe.style["left"] = "0px";
        iframe.style["top"] = "0px";
        iframe.style["width"] = "100%";
        iframe.style["height"] = "100%";

        // Append to the body
        document.body.appendChild(iframe);

        writeDebug("The iframe has been appended to the parent window");

        // Get the content window from the appended iframe
        childElem = document.getElementById("_popup_iframe").contentWindow;

        // Set listeners for clicks that should launch the iframe.
        getClickables(function (clickables) {

            for (var i = 0; i < clickables.length; i++) {
                clickables[i].addEventListener('click', function (event) {

                    writeDebug("A clickable has been clicked and the iframe will be opened.");

                    // Prevent any other native actions bound to this element.
                    event.preventDefault();

                    // Send a message to the iframe
                    openIframe(createCartJsonFromAttributes(event.currentTarget));

                });
            }

        });

    }

    // Used when launching in a new tab / window, usually used in mobile environments.
    var addNonModalListeners = function (target, language) {

        // Set listeners for clicks that should launch the iframe.
        getClickables(function (clickables) {

            for (var i = 0; i < clickables.length; i++) {
                clickables[i].addEventListener('click', function (event) {

                    writeDebug("A clickable has been clicked and a new tab will be opened.");

                    // Prevent any other native actions bound to this element.
                    event.preventDefault();

                    // Create the cart
                    var cart = createCartJsonFromAttributes(event.currentTarget);

                    // Open the tab
                    openTab(cart, target, language);

                });
            }

        });
    }

    function openTab(cart, target, language) {

        writeDebug("The tab is being opened.");

        // Send the cart json into the url
        var q = encodeURIComponent(JSON.stringify(cart));

        // Pop the window
        var url = target + "?cart=" + q;
        if (language)
            url += "&language=" + language;

        childElem = window.open(url);

        // Tell the tab the URL that generated the popup.
        sendMessage({ type: "set_parent_url", url: window.location.href });

    }

    function writeDebug(name, value) {
        if (debug) {
            if (!value) {
                console.log("debug: " + name);
            } else {
                console.log("debug: " + name + ": " + value);
            }
        }
    }

    // This prepares the page for popup
    var initialize = function (callback, enableDebug) {

        readyCallback = callback;

        if (enableDebug)
            debug = true;

        writeDebug("Initialization started.");
        writeDebug("Has a callback been provided?", callback != null ? "Yes" : "No");

        // Get the element that loaded the script
        var script = document.getElementById("_popup_script");

        if (script) {

            // Define the local and remote origins and scriptPaths
            var src = script.getAttribute("src");

            // The app path is the "root" of the app, which is the grandparent of the src directory
            var pathArray = src.split("/").slice(-3);
            appPath = src.substring(0, src.length - pathArray.join("/").length);

            // Set the type of checkout to invoke. The default is "simple" if not provided.
            var type = script.getAttribute("data-popup-type") || "simple";
            writeDebug("type", type);

            // Set the UI. Not all checkout types will have different UIs. Set as "basic" if not provided.
            var ui = script.getAttribute("data-popup-ui") || "basic";
            writeDebug("ui", ui);

            // Set the langauge, if provided. Otherwise, the language will be automatically selected.
            var language = script.getAttribute("data-language");
            writeDebug("language", language || "not specified, will use default language for user");

            // Determine if the user has specified explicitily to use the modal or non modal. If so, overwrite the default choice.
            var setAsModal = script.getAttribute("data-as-modal");
            if (setAsModal) {
                if (setAsModal === "true")
                    asModal = true;
                if (setAsModal === "false")
                    asModal = false;
            }
            writeDebug("Will the app be served as a modal?", asModal ? "Yes" : "No");

            // Define the target URL
            var target = appPath + '#/' + type;

            // If modal, append to the URL path.
            if (asModal) {
                target = target + "-mod";
            }

            // Define the iframe origin
            var i = -1, x = 3; // We're looking for the 3rd instance of / in the src, which will signify the end of the origin
            while (x-- && i++ < src.length) {
                i = src.indexOf("/", i);
                if (i < 0) break;
            }
            childOrigin = src.substring(0, i);

            // If not a fully qualified URL, set the childOrigin to the parent's origin.
            if (src.substring(0, 8) != "https://" && src.substring(0, 8) != "http://") {
                childOrigin = window.location.protocol + "//" + window.location.hostname;
            }
            writeDebug("childOrigin", childOrigin);

            appendAsyncScript(appPath + "settings/app.js", function () {

                // Wire up the listeners
                if (!asModal) {

                    // Wire up the buttons to listen for the click events to open a new tab
                    addNonModalListeners(target, language);

                    // Set an open function that the user can call to manually trigger the popup
                    _popup.open = function (cart) {
                        writeDebug("Modal launched based on open() call from parent page.");
                        openTab(cart, target, language);
                    }

                    // If a callback is provided, fire it.
                    if (callback) {
                        writeDebug("Callback from initialize will be fired.");
                        callback();
                    }

                } else {

                    // Append the iframe to the body when ready
                    var interval = setInterval(function () {

                        if (document.body) {
                            addModalListeners(target, language);
                            clearInterval(interval);

                            // Set an open function that the user can call to manually trigger the popup
                            _popup.open = function (cart) {
                                writeDebug("Modal launched based on open() call from parent page.");
                                openIframe(cart);
                            }

                            // If a callback is provided, fire it.
                            if (callback) {
                                writeDebug("Callback from initialize will be fired.");
                                callback();
                            }
                        }

                    }, 20);
                }

            });

        } else {
            console.warn("The script tag that loads popup.js must contain the attribute id=\"_popup_script\"");
        }

    };

    return {
        // Define a public API
        initialize: initialize
    };

})();

// If embedded as a script reference (rather than a JavaScript reference), invoke the initialize function automatically. Otherwise, it's invoked by the snippet.
(function () {
    var script = document.getElementById("_popup_script");

    function getParameterByName(name, url) {
        if (!url) url = window.location.href;
        name = name.replace(/[\[\]]/g, "\\$&");
        var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
            results = regex.exec(url);
        if (!results) return null;
        if (!results[2]) return "";
        return decodeURIComponent(results[2].replace(/\+/g, " "));
    }

    if (script) {
        if (!script.getAttribute("data-self-init")) {

            var enableDebug = false;
            if (script.getAttribute("data-debug") != null && script.getAttribute("data-debug") === "true")
                enableDebug = true;

            if (getParameterByName("debug") === "true")
                enableDebug = true;

            _popup.initialize(null, enableDebug);
        }
    }
})();