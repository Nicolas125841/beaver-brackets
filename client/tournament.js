(async () => {
    //Require dependencies here
    const axios = require('axios/dist/browser/axios.cjs');
    const bracketry = require('bracketry');
    var _ = require('lodash');

    //State variables
    var index = 0;
    var selectedBracket = null;
    var selectedMatch = null;

    //Define tournament search fields
    const url = document.URL;
    const searchParams = new URLSearchParams(url.split('?')[1]);   
    
    //Define modal form fields
    const playerAField = document.querySelector('#a-name');
    const playerBField = document.querySelector('#b-name');
    const timeField = document.querySelector('#time');
    const placeField = document.querySelector('#place');
    const aScoreMain = document.querySelector('#a-score-main');
    const aScoreSub = document.querySelector('#a-score-sub');
    const bScoreMain = document.querySelector('#b-score-main');
    const bScoreSub = document.querySelector('#b-score-sub');

    //Define html data locations
    const backDraw = document.querySelector('#back-draw');
    const mainWrapper = document.querySelector('#main-bracket');
    const backWrapper = document.querySelector('#back-bracket');
    const eventTabs = document.querySelector('#event-tabs');

    //Define bracket object holder
    var mainBracket = null;
    var backBracket = null;

    //Fetch tournament data
    try {
        var tournamentData = (await axios('/tournaments/' + searchParams.get('id'))).data;

        const options = (bracket) => {
            return {
                navButtonsPosition: 'overTitles',
                useClassicalLayout: true,
                onMatchClick: (match) => {
                    selectedBracket = bracket;

                    matchClickHandler(match);
                }
            };
        };

        const update = async () => {
            if(tournamentData.events[index].type !== 'pool') {
                tournamentData.events[index].main = mainBracket.getAllData();
            }

            if(tournamentData.events[index].type === 'double') {
                tournamentData.events[index].back = backBracket.getAllData();
            }
    
            try {
                tournamentData = (await axios.post('/tournaments/' + searchParams.get('id') + '/update', tournamentData, {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                })).data;
            } catch(error) {
                new Noty({
                    type: 'error',
                    layout: 'topRight',
                    theme: 'relax',
                    text: 'Error updating event!',
                    closeWith: ['click', 'button']
                }).show();
            }
    
            loadEvent(index);
        };
        
        const modalOpen = (modal) => {
            playerAField.value = selectedMatch.sides[0]?.contestantId;
            playerBField.value = selectedMatch.sides[1]?.contestantId;

            if(!selectedMatch.sides[0]?.contestantId) {
                playerAField.value = '';
            }

            if(!selectedMatch.sides[1]?.contestantId) {
                playerBField.value = '';
            }
    
            timeField.value = selectedMatch.matchStatus?.split('|')[0].trim();
            placeField.value = selectedMatch.matchStatus?.split('|')[1].trim();
    
            aScoreMain.value = selectedMatch.sides?.[0]?.scores?.[0]?.mainScore;
            aScoreSub.value = selectedMatch.sides?.[0]?.scores?.[0]?.subscore;
    
            bScoreMain.value = selectedMatch.sides?.[1]?.scores?.[0]?.mainScore;
            bScoreSub.value = selectedMatch.sides?.[1]?.scores?.[0]?.subscore;
        };
    
        const modalClose = (modal) => {
            tournamentData.events[index].main.contestants[playerAField.value] = playerAField.value;
            tournamentData.events[index].main.contestants[playerBField.value] = playerBField.value;

            if(tournamentData.events[index].type === 'double') {
                tournamentData.events[index].back.contestants[playerAField.value] = playerAField.value;
                tournamentData.events[index].back.contestants[playerBField.value] = playerBField.value;
            }
    
            selectedMatch.sides[0] = {
                scores: [
                    {
                        mainScore: aScoreMain.value,
                        subscore: aScoreSub.value
                    }
                ]
            };

            if(playerAField.value) {
                selectedMatch.sides[0].contestantId = playerAField.value;
            }
        
            selectedMatch.sides[1] = {
                scores: [
                    {
                        mainScore: bScoreMain.value,
                        subscore: bScoreSub.value
                    }
                ]
            };

            if(playerBField.value) {
                selectedMatch.sides[1].contestantId = playerBField.value;
            }
    
            if(!timeField.value) {
                timeField.value = 'TBA';
            }
    
            if(!placeField.value) {
                placeField.value = 'TBA';
            }
    
            selectedMatch.matchStatus = timeField.value + ' | ' + placeField.value;
    
            if(selectedBracket === 'main') {
                mainBracket.applyMatchesUpdates([selectedMatch]);
            } else {
                backBracket.applyMatchesUpdates([selectedMatch]);
            }
    
            update();
        };
    
        const bracketModal = new HystModal({
            beforeOpen: modalOpen,
            afterClose: modalClose
        });
    
        const matchClickHandler = (match) => {
            selectedMatch = _.cloneDeep(match);
    
            bracketModal.open('#bracketModal');  
        };

        const loadEvent = (index) => {
            const event = tournamentData.events[index];

            backDraw.classList.add('hidden');

            if(!mainBracket) {
                mainBracket = bracketry.createBracket(event.main, mainWrapper, options('main'));
            } else {
                mainBracket.replaceData(event.main);
            }

            if(event.type === 'double') {
                backDraw.classList.remove('hidden');

                if(!backBracket) {
                    backBracket = bracketry.createBracket(event.back, backWrapper, options('back'));
                } else {
                    backBracket.replaceData(event.back);
                }
            }
        };

        for(var i = 0; i < tournamentData.events.length; i++) {
            const eventTab = document.createElement('input');

            eventTab.type = 'button';
            eventTab.value = tournamentData.events[i].name;
            eventTab.dataset.index = i;

            eventTabs.appendChild(eventTab);
        }
        
        (() => {
            const eventTab = document.createElement('input');

            eventTab.type = 'button';
            eventTab.value = 'Add Event';
            eventTab.dataset.index = tournamentData.events.length;

            eventTabs.appendChild(eventTab);
        })();

        eventTabs.addEventListener('click', (event) => {
            index = parseInt(event.target.dataset.index);

            if(index === tournamentData.events.length) {
                window.location.href = '/load.html?id=' + searchParams.get('id'); 
            } else {
                loadEvent(event.target.dataset.index);
            }
        });

        index = 0;
        loadEvent(0);
    } catch(error) {
        new Noty({
            type: 'error',
            layout: 'topRight',
            theme: 'relax',
            text: 'Error loading event!',
            closeWith: ['click', 'button']
        }).show();

        console.log(error);
    }
})();