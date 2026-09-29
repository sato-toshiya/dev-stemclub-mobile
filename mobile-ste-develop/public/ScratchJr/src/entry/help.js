import {gn, onTouchEndBind, getUrlVars} from '../utils/lib';
import Localization from '../utils/Localization';
import OS from '../tablet/OS';
import Lobby from '../lobby/Lobby';

export function helpMain () {
    // Hide topbar in help page
    var topbar = gn('topbar');
    if (topbar) {
        topbar.style.display = 'none';
    }
    helpStrings();
    OS.getsettings(doNext);
    function doNext (str) {
        var list = str.split(',');
        OS.path = list[1] == '0' ? list[0] + '/' : undefined;
        // Set place=help in URL to load help tab content
        var urlvars = getUrlVars();
        var hasPlace = false;
        if (Array.isArray(urlvars)) {
            hasPlace = urlvars.indexOf('place') >= 0;
        } else {
            hasPlace = urlvars.place !== undefined;
        }
        if (!hasPlace) {
            var newUrl = window.location.pathname + '?place=help';
            window.history.replaceState({}, '', newUrl);
        }
        // Initialize Lobby - it will read place=help from URL and load help tab
        Lobby.appinit(window.Settings.scratchJrVersion);
    }
}

function helpGoBack () {
    window.location.href = 'index.html?back=yes';
}

function helpStrings () {
    // Footer elements are not present in help.html, so skip localization
    // No footer tabs in help page
}
