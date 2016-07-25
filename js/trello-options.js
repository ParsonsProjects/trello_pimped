
var $body = $('body');

//this application only has one component: app
var app = {};

var orginal = {
	loggedIn: m.prop(false),
	boards: [],
	cards: [],
	lists: [],
	card: {},
	current: {
		card: m.prop(''),
		board: m.prop(''),
		list: m.prop('')
	},
	timer: {
		id: m.prop(''),
		started: m.prop(false),
		paused: m.prop(false)
	}
}

var user = {
	loggedIn: m.prop(false),
	boards: [],
	cards: [],
	lists: [],
	card: {},
	current: {
		card: m.prop(localStorage.getItem('currentCard')),
		board: m.prop(localStorage.getItem('currentBoard')),
		list: m.prop(localStorage.getItem('currentList'))
	},
	timer: {
		id: m.prop(localStorage.getItem('timerID')),
		started: m.prop(localStorage.getItem('timerStarted')),
		paused: m.prop(localStorage.getItem('timerPaused'))
	}
}

var showCards = () => {

	$body.addClass('is-open');
	$('.js-board, .js-list').addClass('is-hidden');
	$('.js-card').removeClass('is-hidden');

}

var showLists = () => {

	$body.addClass('is-open');
	$('.js-card, .js-board').addClass('is-hidden');
	$('.js-list').removeClass('is-hidden');

}

var showBoards = () => {

	$body.addClass('is-open');
	$('.js-card, .js-list').addClass('is-hidden');
	$('.js-board').removeClass('is-hidden');

}

var getTrelloCard = (id) => {

	return new Promise((resolve) => {

		if(!id || id == null) {
			resolve([]);
		} else {

			chrome.runtime.sendMessage({
			    from:    'trello',
			    subject: 'getCard',
			    value: id
			});

			chrome.runtime.onMessage.addListener((msg, sender) => {

				if ((msg.from === 'background') && (msg.subject === 'getCard')) {
					resolve(msg.value);
				}

			});

		}

	});

}

var checkAuth = {
	view: function(ctrl, args) {
		var output = m('.interface.logged-out', [
			m('span.connect', { onclick: function(e){
				e.preventDefault();
				setAuth();
			} }, 'Connect to Trello')
		])
		if(user.loggedIn()) {
			output = m('', [
				m('.interface', [
					m('span.toggle-settings', { onclick: function(){
						$('.interface').toggleClass('is-open');
						$('body').removeClass('is-open');
					} }, 'S'),
					m.component(userActions),
				]),
				m.component(userMenu),
				m.component(userBoards),
				m.component(userLists),
				m.component(userCards)
			]);
		}
		return output;
	}
}

var userMenu = {
	view: function(ctrl, args) {
		var markup = m('');
		markup = m('', [
			m('span.change-board', { onclick: function(){
				showBoards();
			} }, 'B'),
			m('span.change-list', { onclick: function(){
				showLists();
			} }, 'L'),
			m('span.change-card', { onclick: function(){
				showCards();
			} }, 'C'),
			m('span.disconnect', { onclick: function(e){
				e.preventDefault();
				if(user.timer.started()) timerLog('Timer stopped - *'+moment().format('H:mm a on MMM D, YYYY')+'*', {'type': 'stopped', 'time': moment()});
				user = orginal;
				chrome.runtime.sendMessage({
				    from: 'trello',
				    subject: 'clear'
				});
				$body.removeClass('is-open');
				$('.interface').removeClass('is-open');
				m.redraw();
			} }, 'D'),
		]);
		return markup;
	}
}

var userActions = {
	view: function(ctrl, args) {
		var markup = m('');
		if(user.current.card()) {

			markup = m('span', [
				currentCard(),
				m('span.user-actions', [
					playButton(),
					pauseButton(),
					stopButton(),
					timerClock()
				])
			])

			function currentCard() {
				if(user.card) {
					return m('span', m.trust('<a target="_blank" href="' +user.card.shortUrl+ '" title="' +user.card.name+ '">' + truncate.apply(user.card.name, [30, true]) + '</a>'))
				}

			}

			function timerClock() {

				if(user.timer.started()) {
					// return m('', user.)
				}

			}

			function pauseButton() {

				if(user.timer.started() && !user.timer.paused()) {
					return m('span.icon button [title="Pause"]', {
						onclick: (e) => {
							e.preventDefault();
							user.timer.paused(true);
							chrome.runtime.sendMessage({
						    	from: 'trello',
							    subject: 'set',
							    label: 'timerPaused',
							    value: true
							});
							// set comments time
							timerLog('Timer paused - *'+moment().format('H:mm a on MMM D, YYYY')+'*', {'type': 'paused', 'time': moment()});
						}
					}, 'Pause', [
						m('i.pause icon')
					])
				}

			}

			function stopButton() {

				if(user.timer.started()) {
					return m('.icon button[title="Stop"]', {
						onclick: (e) => {
							e.preventDefault();
							// set comments time
							user.timer.started(false);
							timerLog('Timer stopped - *'+moment().format('H:mm a on MMM D, YYYY')+'*', {'type': 'stopped', 'time': moment()});
						}
					}, 'Stop', [
						m('i.stop icon')
					])
				}

			}

			function playButton() {

				if(!user.timer.started()) {
					return m('.icon button [title="Start"]', {
						onclick: (e) => {
							e.preventDefault();
							// clear out data
							timerDates = [];
							timerData = [];
							user.timer = orginal.timer;
							// set initial comments time
							user.timer.started(true);
							chrome.runtime.sendMessage({
						    	from: 'trello',
							    subject: 'set',
							    label: 'timerStarted',
							    value: true
							});
							timerStart('Timer started - *'+moment().format('H:mm a on MMM D, YYYY')+'*', {'type': 'play', 'time': moment()});
						}
					}, 'Start', [
						m('i.play icon')
					])
				}

				if(user.timer.started() && user.timer.paused()) {
					return m('.icon button [title="Resume"]', {
						onclick: (e) => {
							e.preventDefault();
							user.timer.paused(false);
							// set comments time
							timerLog('Timer resumed - *'+moment().format('H:mm a on MMM D, YYYY')+'*', {'type': 'play', 'time': moment()});
						}
					}, 'Resume', [
						m('i.play icon')
					])
				}

			}

		}
		return markup
	}
}

var timerLog = (timerData, timerDates) => {

	return new Promise((resolve) => {

		chrome.runtime.sendMessage({
		    from: 'trello',
		    subject: 'timerLog',
		    value: {
		    	card: user.current.card(),
		    	comment: user.timer.id()
		    },
		    data: timerData,
		    dates: timerDates
		});

		chrome.runtime.onMessage.addListener((msg, sender) => {

			if ((msg.from === 'background') && (msg.subject === 'timerLog')) {
				resolve(msg.value);
				if(!user.timer.started()) {
					chrome.runtime.sendMessage({
				    	from: 'trello',
					    subject: 'timerStop'
					});
				}
			}

		});

	});

}

var timerStart = (timerData, timerDates) => {

	return new Promise((resolve) => {

		chrome.runtime.sendMessage({
		    from: 'trello',
		    subject: 'timerStart',
		    value: user.current.card(),
		    data: timerData,
		    dates: timerDates
		});

		chrome.runtime.onMessage.addListener((msg, sender) => {

			if ((msg.from === 'background') && (msg.subject === 'timerStart')) {
				user.timer.id(msg.value.id);
				resolve(msg.value);
			}

		});

	});

}

var userCards = {
	getCard: function() {
		if(user.current.card()) {
			getTrelloCard(user.current.card()).then((card) => {
				user.card = card;
				$body.removeClass('is-open');
				$('.interface').removeClass('is-open');
			});
		}
	},
	controller: function() {
		var ctrl = this;
		ctrl.changeCard = function(value, text, $selectedItem) {
			if(!user.timer.started()) {
				user.current.card(value);
				chrome.runtime.sendMessage({
			    	from: 'trello',
				    subject: 'set',
				    label: 'currentCard',
				    value: value
				});
				userCards.getCard();
			} else {
				alert('Time log already running!');
			}
		}
	},
    view: function(ctrl, args) {
    	var data = {
    		data: user.cards,
          	value: user.current.card,
          	onchange: ctrl.changeCard,
          	label: 'Card',
    		addClass: 'js-card'
    	}
    	if(!user.current.board()) data.addClass += ' disabled';
    	var markup = m.component(Select, data);
		return markup;
    }
}

userCards.getCard();

var userLists = {
	controller: function() {
		this.changeList = function(value, text, $selectedItem) {
			chrome.runtime.sendMessage({
		    	from: 'trello',
			    subject: 'set',
			    label: 'currentList',
			    value: value
			});
			user.current.card('');
			user.current.list(value);
			getCards(value).then((cards) => {
				m.startComputation();
				user.cards = cards;
				m.endComputation();
				showCards();
			});
		}
	},
    view: function(ctrl, args) {
		var markup = m.component(Select, {
          	data: user.lists,
          	value: user.current.list,
          	onchange: ctrl.changeList,
          	label: 'List',
          	addClass: 'js-list'
        });
		return markup;
    }
}

var userBoards = {
	controller: function() {
		this.changeBoard = function(value, text, $selectedItem) {
			if(!user.timer.started()) {
				chrome.runtime.sendMessage({
			    	from: 'trello',
				    subject: 'set',
				    label: 'currentBoard',
				    value: value
				});
				user.current.card('');
				user.current.board(value);
				getLists(value).then((lists) => {
					m.startComputation();
					user.lists = lists;
					m.endComputation();
					showLists();
				});
			} else {
				alert('Time log already running!');
			}
		}
	},
    view: function(ctrl, args) {
    	var markup = m.component(Select, {
          	data: user.boards,
          	value: user.current.board,
          	onchange: ctrl.changeBoard,
          	label: 'Board',
          	addClass: 'js-board'
        });
		return markup;
    }
}

var Select = {
	//    Returns a select box
    view: function(ctrl, attrs) {
        var selectedId = attrs.value();
        //Create a Select progrssively enhanced SELECT element
        return m('.select is-hidden ' + attrs.addClass, [
			m('.menu', [
				m('.scrolling menu', [
					attrs.data.map(function(item, index) {
			        	if(!item.closed) {
			                return m('.item[data-id="'+item.id+'"]', {
			                	onclick: function() {
			                		var value = $(this).data().id;
							    	var text = $(this).text();
							    	attrs.onchange(value, text, $(this));
			                	}
			                }, m.trust(truncate.apply(item.name, [30, true])))
			            }
			        })
				])
			])
        ]);
    }
}

//here's the view
app.view = function() {
    return [
		m.component(checkAuth)
    ]
};


$(() => {

	chrome.runtime.sendMessage({
	    from:    'trello',
	    subject: 'runSync'
	});

	$('body').on('click', '.result', function(e){
		e.preventDefault();
		e.stopPropagation();
	});

})

chrome.runtime.onMessage.addListener((msg, sender) => {

	if ((msg.from === 'trello') && (msg.subject === 'update')) updateLoggedIn();
	if ((msg.from === 'background') && (msg.subject === 'synced')) {
		user = {
			loggedIn: m.prop(false),
			boards: [],
			cards: [],
			lists: [],
			current: {
				card: m.prop(localStorage.getItem('currentCard')),
				board: m.prop(localStorage.getItem('currentBoard')),
				list: m.prop(localStorage.getItem('currentList'))
			},
			timer: {
				id: m.prop(localStorage.getItem('timerID')),
				started: m.prop(localStorage.getItem('timerStarted')),
				paused: m.prop(localStorage.getItem('timerPaused'))
			}
		}
		updateLoggedIn();
	}

});

var setAuth = () => {

	chrome.runtime.sendMessage({
	    from:    'trello',
	    subject: 'showApp'
	});

}

var getLists = (id) => {

	return new Promise((resolve) => {

		if(!id || id == null) {
			resolve([]);
		} else {

			chrome.runtime.sendMessage({
			    from:    'trello',
			    subject: 'getLists',
			    value: id
			});

			chrome.runtime.onMessage.addListener((msg, sender) => {

				if ((msg.from === 'background') && (msg.subject === 'getLists')) {
					resolve(msg.value);
				}

			});

		}

	});

}

var getCards = (id) => {

	return new Promise((resolve) => {

		if(!id || id == null) {
			resolve([]);
		} else {

			chrome.runtime.sendMessage({
			    from:    'trello',
			    subject: 'getCards',
			    value: id
			});

			chrome.runtime.onMessage.addListener((msg, sender) => {

				if ((msg.from === 'background') && (msg.subject === 'getCards')) {
					resolve(msg.value);
				}

			});

		}

	});

}

var getBoards = () => {

	return new Promise((resolve) => {

		chrome.runtime.sendMessage({
		    from:    'trello',
		    subject: 'getBoards'
		});

		chrome.runtime.onMessage.addListener((msg, sender) => {

			if ((msg.from === 'background') && (msg.subject === 'getBoards')) {
				resolve(msg.value);
			}

		});

	});

}

var updateLoggedIn = () => {

	m.startComputation();

	chrome.runtime.sendMessage({
	    from:    'trello',
	    subject: 'status'
	});

	chrome.runtime.onMessage.addListener((msg, sender) => {

		if ((msg.from === 'background') && (msg.subject === 'status')) {

			if(msg.value) {
				user.loggedIn(msg.value);
	            getBoards().then((boards) => {
	            	user.boards = boards;
	            	getLists(user.current.board()).then((lists) => {
		            	user.lists = lists;
		            	getCards(user.current.list()).then((cards) => {
			            	user.cards = cards;
			            	m.endComputation();
			            });
		            });
	            });
			} else {
				user.loggedIn(msg.value);
			}

			m.endComputation();

		}

	});

}

function truncate( n, useWordBoundary ){
    var isTooLong = this.length > n,
        s_ = isTooLong ? this.substr(0,n-1) : this;
        s_ = (useWordBoundary && isTooLong) ? s_.substr(0,s_.lastIndexOf(' ')) : s_;
    return  isTooLong ? s_ + '&hellip;' : s_;
};

//initialize the application
m.mount(document.body, app);


