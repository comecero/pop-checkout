window.__pageview = (function () {
    
    var cookies = {};

    function recordPageLoad(_page) {
        console.log("If this app was running in the hosted environment, a pageview would have been recorded. In development, no pageview calls are recorded.");
    }
    
    function manualRecord() {

        // Check for an element with the id of __pageview
        var elem = document.getElementById("__pageview");
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
        recordPageLoad: recordPageLoad,
        manualRecord: manualRecord
    };

})();

// A page load can be recorded implicitly by page load or explicitly by function call.

// In typical applications, you simply embed the analytics script on each page and the page load is recorded when the script is loaded.
// For example: <script src="analytics/pageview.js"></script>

// For single page applications, this approach will not work because page views are "virtual". In that case, you embed the script with an id of __pageview and an attribute of data-manual-record.
// For example: <script id="__pageview" data-manual-record src="analytics/pageview.js"></script>
// If the id is provided and the attribute data-manual-record is provided, then the script never implicitly records a page view. Instead, the app manually records the pageview by calling window.__pageview.recordPageLoad() as needed.
// the recordPageLoad function takes an optional parameter "page" which will be used to set the page that recorded. If not provided, the page is determined from the URL and whether or not the app uses hash-based navigation.

if (!__pageview.manualRecord()) {
    window.__pageview.recordPageLoad();
}