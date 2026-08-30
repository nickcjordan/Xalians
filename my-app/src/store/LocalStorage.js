var LocalDuelStorage = (function () {


    var duel_board_size = undefined;

    var getBoardSize = function () {
        // let localSize = window.localStorage.getItem('duel_board_size');
        let localSize = window.sessionStorage.getItem('duel_board_size');
        if (localSize) {
            return JSON.parse(localSize);
        } else {
            return duel_board_size;
        }
    };

    var setBoardSize = function (size) {
        window.sessionStorage.setItem('duel_board_size', JSON.stringify(size));
        duel_board_size = size;
    };


    var selected_xalian_id = undefined;

    var getSelectedXalianId = function () {
        // let localId = window.localStorage.getItem('selected_xalian_id');
        if (selected_xalian_id) {
            return selected_xalian_id;
        } else {
            let item = window.sessionStorage.getItem('selected_xalian_id');
            return item === 'null' ? null : item;
        }
    };

    var setSelectedXalianId = function (id) {
        window.sessionStorage.setItem('selected_xalian_id', id);
        selected_xalian_id = id;
    };

    var removeSelectedXalianId = function () {
        window.sessionStorage.removeItem('selected_xalian_id');
        selected_xalian_id = null;
    };


    var referenced_xalian_id = undefined;

    var getReferencedXalianId = function () {
        if (referenced_xalian_id) {
            return referenced_xalian_id;
        } else {
            let item = window.sessionStorage.getItem('referenced_xalian_id');
            return item === 'null' ? null : item;
        }
    };

    var setReferencedXalianId = function (id) {
        window.sessionStorage.setItem('referenced_xalian_id', id);
        referenced_xalian_id = id;
    };

    var removeReferencedXalianId = function () {
        window.sessionStorage.removeItem('referenced_xalian_id');
        referenced_xalian_id = null;
    };
    

    // unlike the rest of this module, "have they read the rules?" should outlive the
    // browser session - so it uses localStorage, guarded because private-mode browsers
    // can throw on access rather than simply returning nothing.
    var HOW_TO_PLAY_SEEN_KEY = 'duel_how_to_play_seen';

    var hasSeenHowToPlay = function () {
        try {
            return window.localStorage.getItem(HOW_TO_PLAY_SEEN_KEY) === 'true';
        } catch (e) {
            return true; // can't remember the dismissal, so don't nag on every visit
        }
    };

    var setHowToPlaySeen = function () {
        try {
            window.localStorage.setItem(HOW_TO_PLAY_SEEN_KEY, 'true');
        } catch (e) {
            // nothing to do - the modal is still reachable from the ? button
        }
    };


    return {
        hasSeenHowToPlay: hasSeenHowToPlay,
        setHowToPlaySeen: setHowToPlaySeen,
        getBoardSize: getBoardSize,
        setBoardSize: setBoardSize,
        getSelectedXalianId: getSelectedXalianId,
        setSelectedXalianId: setSelectedXalianId,
        getReferencedXalianId: getReferencedXalianId,
        setReferencedXalianId: setReferencedXalianId,
        removeSelectedXalianId: removeSelectedXalianId,
        removeReferencedXalianId: removeReferencedXalianId
    }

})();

export default LocalDuelStorage;