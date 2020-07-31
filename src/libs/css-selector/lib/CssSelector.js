import ElementSelector from './ElementSelector';
import ElementSelectorList from './ElementSelectorList';

export default class CssSelector {
	constructor(options) {
		var me = this;

		// defaults
		this.ignoredTags = ['font', 'b', 'i', 's'];
		this.parent = document;
		this.ignoredClassBase = false;
		this.enableResultStripping = true;
		this.enableSmartTableSelector = false;
		this.ignoredClasses = [];
		this.query = function (selector) {
			return this.parent.querySelectorAll(selector);
		};

		// overrides defaults with options
		for (let i in options) {
			this[i] = options[i];
		}

		// jquery parent selector fix
		if (this.query === window.jQuery) {
			this.query = function (selector) {
				return jQuery(me.parent).find(selector);
			};
		}
	}

	mergeElementSelectors(newSelectors) {
		if (newSelectors.length < 1) {
			throw 'No selectors specified';
		} else if (newSelectors.length === 1) {
			return newSelectors[0];
		}

		// check selector total count
		let elementCountInSelector = newSelectors[0].length;
		for (let i = 0; i < newSelectors.length; i++) {
			let selector = newSelectors[i];
			if (selector.length !== elementCountInSelector) {
				throw 'Invalid element count in selector';
			}
		}

		// merge selectors
		const resultingElements = newSelectors[0];
		for (let i = 1; i < newSelectors.length; i++) {
			let mergeElements = newSelectors[i];

			for (let j = 0; j < elementCountInSelector; j++) {
				resultingElements[j].merge(mergeElements[j]);
			}
		}
		return resultingElements;
	}

	stripSelector(selectors) {
		let cssSelector = selectors.getCssSelector();
		let baseSelectedElements = this.query(cssSelector);

		let compareElements = function (elements) {
			if (baseSelectedElements.length !== elements.length) {
				return false;
			}

			for (let j = 0; j < baseSelectedElements.length; j++) {
				if ([].indexOf.call(elements, baseSelectedElements[j]) === -1) {
					return false;
				}
			}
			return true;
		};
		// strip indexes
		for (let i = 0; i < selectors.length; i++) {
			let selector = selectors[i];
			if (selector.index !== null) {
				let index = selector.index;
				selector.index = null;
				let cssSelector1 = selectors.getCssSelector();
				let newSelectedElements = this.query(cssSelector1);
				// if results doesn't match then undo changes
				if (!compareElements(newSelectedElements)) {
					selector.index = index;
				}
			}
		}

		// strip isDirectChild
		for (let i = 0; i < selectors.length; i++) {
			let selector = selectors[i];
			if (selector.isDirectChild === true) {
				selector.isDirectChild = false;
				let cssSeletor2 = selectors.getCssSelector();
				let newSelectedElements = this.query(cssSeletor2);
				// if results doesn't match then undo changes
				if (!compareElements(newSelectedElements)) {
					selector.isDirectChild = true;
				}
			}
		}

		// strip ids
		for (let i = 0; i < selectors.length; i++) {
			let selector = selectors[i];
			if (selector.id !== null) {
				let id = selector.id;
				selector.id = null;
				let cssSeletor3 = selectors.getCssSelector();
				let newSelectedElements = this.query(cssSeletor3);
				// if results doesn't match then undo changes
				if (!compareElements(newSelectedElements)) {
					selector.id = id;
				}
			}
		}

		// strip classes
		for (let i = 0; i < selectors.length; i++) {
			let selector = selectors[i];
			if (selector.classes.length !== 0) {
				for (let j = selector.classes.length - 1; j > 0; j--) {
					let cclass = selector.classes[j];
					selector.classes.splice(j, 1);
					let cssSeletor4 = selectors.getCssSelector();
					let newSelectedElements = this.query(cssSeletor4);
					// if results doesn't match then undo changes
					if (!compareElements(newSelectedElements)) {
						selector.classes.splice(j, 0, cclass);
					}
				}
			}
		}

		// strip tags
		for (let i = selectors.length - 1; i > 0; i--) {
			let selector = selectors[i];
			selectors.splice(i, 1);
			let cssSeletor5 = selectors.getCssSelector();
			let newSelectedElements = this.query(cssSeletor5);
			// if results doesn't match then undo changes
			if (!compareElements(newSelectedElements)) {
				selectors.splice(i, 0, selector);
			}
		}

		return selectors;
	}

	getElementSelectors(elements, top) {
		let elementSelectors = [];

		for (let i = 0; i < elements.length; i++) {
			let element = elements[i];
			let elementSelector = this.getElementSelector(element, top);
			elementSelectors.push(elementSelector);
		}

		return elementSelectors;
	}

	getElementSelector(element, top) {
		let elementSelectorList = new ElementSelectorList(this);
		while (true) {
			if (element === this.parent) {
				break;
			} else if (element === undefined || element === this.parent) {
				throw 'element is not a child of the given parent';
			}
			if (this.isIgnoredTag(element.tagName)) {
				element = element.parentNode;
				continue;
			}
			if (top > 0) {
				top--;
				element = element.parentNode;
				continue;
			}

			let selector = new ElementSelector(element, this.ignoredClasses);
			// document does not have a tagName
			if (
				element.parentNode === this.parent ||
				this.isIgnoredTag(element.parentNode.tagName)
			) {
				selector.isDirectChild = false;
			}

			elementSelectorList.push(selector);
			element = element.parentNode;
		}

		return elementSelectorList;
	}

	/**
	 * Compares whether two elements are similar. Similar elements should
	 * have a common parrent and all parent elements should be the same type.
	 * @param element1
	 * @param element2
	 */
	checkSimilarElements(element1, element2) {
		while (true) {
			if (element1.tagName !== element2.tagName) {
				return false;
			}
			if (element1 === element2) {
				return true;
			}

			// stop at body tag
			if (
				element1 === undefined ||
				element1.tagName === 'body' ||
				element1.tagName === 'BODY'
			) {
				return false;
			}
			if (
				element2 === undefined ||
				element2.tagName === 'body' ||
				element2.tagName === 'BODY'
			) {
				return false;
			}

			element1 = element1.parentNode;
			element2 = element2.parentNode;
		}
	}

	/**
	 * Groups elements into groups if the emelents are not similar
	 * @param elements
	 */
	getElementGroups(elements) {
		// first elment is in the first group
		// @TODO maybe i dont need this?
		let groups = [[elements[0]]];

		for (let i = 1; i < elements.length; i++) {
			let elementNew = elements[i];
			let addedToGroup = false;
			for (let j = 0; j < groups.length; j++) {
				let group = groups[j];
				let elementGroup = group[0];
				if (this.checkSimilarElements(elementNew, elementGroup)) {
					group.push(elementNew);
					addedToGroup = true;
					break;
				}
			}

			// add new group
			if (!addedToGroup) {
				groups.push([elementNew]);
			}
		}

		return groups;
	}

	getCssSelector(elements, top) {
		top = top || 0;

		let enableSmartTableSelector = this.enableSmartTableSelector;
		if (elements.length > 1) {
			this.enableSmartTableSelector = false;
		}

		// group elements into similarity groups
		let elementGroups = this.getElementGroups(elements);

		let resultCSSSelector;

		if (this.allowMultipleSelectors) {
			let groupSelectors = [];

			for (let i = 0; i < elementGroups.length; i++) {
				let groupElements = elementGroups[i];

				let elementSelectors = this.getElementSelectors(groupElements, top);
				let resultSelector = this.mergeElementSelectors(elementSelectors);
				if (this.enableResultStripping) {
					resultSelector = this.stripSelector(resultSelector);
				}

				groupSelectors.push(resultSelector.getCssSelector());
			}

			resultCSSSelector = groupSelectors.join(', ');
		} else {
			if (elementGroups.length !== 1) {
				throw 'found multiple element groups, but allowMultipleSelectors disabled';
			}

			let elementSelectors = this.getElementSelectors(elements, top);
			let resultSelector = this.mergeElementSelectors(elementSelectors);
			if (this.enableResultStripping) {
				resultSelector = this.stripSelector(resultSelector);
			}

			resultCSSSelector = resultSelector.getCssSelector();
		}

		this.enableSmartTableSelector = enableSmartTableSelector;

		// strip down selector
		return resultCSSSelector;
	}

	isIgnoredTag(tag) {
		return this.ignoredTags.indexOf(tag.toLowerCase()) !== -1;
	}
}
