availablePoints = 30;

var Tree = function(value) {
	this.points = 0;
	this.value = value;

	this.updateTree = function(isIncrementing) {
		var i;
		var startingMasteryId = this.value * 24;
		for (i = startingMasteryId; i < startingMasteryId + 23; i++) {
			var id = "m" + i;
			var currentMastery = masteries[id];
			var rowReqsMet = currentMastery.row * 4 <= this.points;

			if (isIncrementing && currentMastery.isColored()) {
				$("#" + id).find(".colorBlock").show();
				$("#" + id).find(".greyBlock").hide();

			} else {
				if (!currentMastery.isColored()) {
					$("#" + id).find(".colorBlock").hide();
					$("#" + id).find(".greyBlock").show();
				}
			}

			var hasDependency = typeof(currentMastery.dependency) != "undefined";
			var color;

			if (currentMastery.current == currentMastery.maximum) {
				color = "yellow";
			} else if (currentMastery.isColored()) {
				color = "green";
			} else {
				color = "grey";
			}

			$("#" + id).css("border", "4px solid " + color);
			if (hasDependency) {
				var $bridge = $("#" + id).find(".bridge");
				$bridge.css("border-right", "2px solid " + color);
				$bridge.css("border-left", "2px solid " + color);
				$bridge.css("background", color);
			}
		}
	}
};

var treeNames = {
	OFFENSE: 0,
	DEFENSE: 1,
	UTILITY: 2
};

var offenseTree = new Tree(treeNames.OFFENSE);
var defenseTree = new Tree(treeNames.DEFENSE);
var utilityTree = new Tree(treeNames.UTILITY);

var Mastery = function(data, tree, row, coordinates) {
	this.id = data["id"];
	this.current = 0;
	this.maximum = data["max"];
	this.tree = tree;
	this.row = row;
	this.coordinates = coordinates;
	this.description = data["description"];
	this.dependency = data["dependency"];
	this.title = data["title"];

	this.isColored = function() {
		if (this.row == 0) {
			return true;
		}

		// check that prior rows have sufficient points
		var requiredPoints = 4 * this.row;
		var totalPointsFromPreviousRows = 0;
		var start = this.tree.value * 24;
		var startOfThisRow = (this.tree.value * 24) + this.row * 4;
		var i;
		for (i = start; i < startOfThisRow; i++) {
			totalPointsFromPreviousRows += masteries["m" + i].current;
		}

		if (totalPointsFromPreviousRows < requiredPoints) {
			return false;
		}

		var rowReqsMet = (this.row * 4 <= this.tree.points) && this.current <= this.maximum;

		var dependencyMet = true;
		if (typeof(this.dependency) != "undefined") {
			var dependencyMastery = masteries[this.dependency];
			dependencyMet = dependencyMastery.current == dependencyMastery.maximum;
		}
		return rowReqsMet && dependencyMet;
	};

	this.canIncrement = function() {
		var dependencyMet = true;
		if (typeof(this.dependency) != "undefined") {
			var dependencyMastery = masteries[this.dependency];
			dependencyMet = dependencyMastery.current == dependencyMastery.maximum;
		}

		return dependencyMet && this.current < this.maximum && this.row * 4 <= this.tree.points;
	}

	this.canDecrement = function() {
		if (!this.isColored() || this.current == 0) {
			return false;
		}

		var start = parseInt(this.id.substring(1));
		var i;
		for (i = start + 1; i < (this.tree.value + 1) * 24 - 1; i++) {
			var m = masteries["m" + i];
			if (m.isColored() && m.current > 0) {
				this.current -= 1;
				this.tree.points -= 1;
				if (!m.isColored()) {
					this.current += 1;
					this.tree.points += 1;
					return false;
				}
				this.current += 1;
				this.tree.points += 1;
			}
		}
		return true;
	};

	this.increment = function(div) {
		if (!this.canIncrement()) {
			return;
		}
		this.current += 1;
		this.tree.points += 1;
		availablePoints -= 1;
		div.find(".pointBlock").text(this.calcPoints());
		this.tree.updateTree(true);
	}

	this.decrement = function(div) {
		if (!this.canDecrement()) {
			return;
		}
		this.current -= 1;
		this.tree.points -= 1;
		availablePoints += 1;
		div.find(".pointBlock").text(this.calcPoints());
		this.tree.updateTree(false);
	}

	this.calcPoints = function() {
		return this.current + "/" + this.maximum;
	}
};

var getTree = function(treeNum) {
	switch(treeNum) {
		case 0:
			return offenseTree;
		case 1:
			return defenseTree;
		case 2:
			return utilityTree;
	}
};

masteries = {};

$(document).ready(function() {

	fillData();
	buildDom();
	updateCounters();

	// create tooltip
	var $tooltip = $("#tooltip");
	window.onmousemove = function(e) {
		var x = e.clientX, y = e.clientY;
		$tooltip.css('position', 'absolute');
		$tooltip.css('top', (y + 20) + 'px');
		$tooltip.css('left', (x + 20) + 'px');
	}

});

var fillData = function() {
	var mNum = 0;
	var xCount = 0;
	var yCount = 0;
	var treeNum = 0;
	while (yCount < 6) {
		while (xCount < 10) {

			if (mNum > 71) {
				break;
			}
			if (mNum != 0 && mNum % 24 == 0) {
				treeNum += 1;
			}

			var id = "m" + mNum;
			var currentRow = parseInt((mNum - (treeNum * 24)) / 4);
			var masteryData = masteriesData[mNum];

			masteryData["tree"] = treeNum;
			masteryData["row"] = currentRow;

			var x = 480 - xCount * 48;
			var y = 288 - yCount * 48;
			coordinates = "" + x + "px " + y + "px";
			masteryData["coordinates"] = coordinates;

			var mastery = new Mastery(masteryData, getTree(treeNum), currentRow, coordinates);
			masteries[id] = mastery;
			mNum++;

			if (masteryData["invis"]) {
				continue;
			};
			xCount++;
		}
		xCount = 0;
		yCount++;
	}
}

var buildDom = function() {
	var i = 0;
	for (i = 0; i < 72; i++) {
		var id = "m" + i;
		var mastery = masteries[id];

		var $box = $("#" + id);

		var $colorBlock = $("<div />").addClass("colorBlock");
		$box.append($colorBlock);
		$colorBlock.css("background-position", mastery.coordinates);

		var $greyBlock = $("<div />").addClass("greyBlock");
		$box.append($greyBlock);
		$greyBlock.css("background-position", mastery.coordinates);

		var $pointBlock = $("<div />").addClass("pointBlock").text(mastery.calcPoints());
		$box.append($pointBlock);

		if (typeof(mastery.dependency) != "undefined") {
			var $bridge = $("<div />").addClass("bridge");
			$box.append($bridge);
		}

		$box.hover(function(event) {
			var $tooltip = $("#tooltip");
			$tooltip.css("visibility", "visible");
			currentMastery = masteries[$(event.currentTarget).attr('id')];
			var htmlString = ""
			htmlString += "<h2>" + currentMastery.title + "</h2>";
			htmlString += "<h3> Rank: " + currentMastery.current + "/" + currentMastery.maximum + "</h3>";
			$tooltip.html(htmlString);


		}, function(event) {
			var $tooltip = $("#tooltip");
			$tooltip.css("visibility", "hidden");
		});



		$box.mousedown(function(event) {
			var $clickedMastery = $(event.currentTarget);
			var currentMastery = masteries[$clickedMastery.attr("id")];

			switch(event.which) {
				case 1:
					currentMastery.increment($clickedMastery);
					break;
				case 2:
					currentMastery.decrement($clickedMastery);
					break;
			}
			updateCounters();
		});
	};

	offenseTree.updateTree(true);
	defenseTree.updateTree(true);
	utilityTree.updateTree(true);
}

var updateCounters = function() {
	$("#availablePoints").text(availablePoints);
	$("#offensePoints").text(offenseTree.points);
	$("#defensePoints").text(defenseTree.points);
	$("#utilityPoints").text(utilityTree.points);
}