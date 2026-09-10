module.exports = class Move {

    constructor() {
        this.name = "";
        this.description = "";
        this.baseMove = null;
        this.type = null;
        this.element = null;
        this.qualifier = null;
        this.potential = 10;
		this.cost = 10;
    }

    buildName() {
        var result = "";
        if (this.qualifier != null) {
            result += this.qualifier.word + " ";
        } 
        if (this.element != null) {
            result += this.element.word + " ";
        } 
        result += this.baseMove.word;
        return result;
    }

}
