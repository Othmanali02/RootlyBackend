async function genID() {
	const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789";
	let result = "";
	const length = 5; 
	for (let i = 0; i < length; i++) {
		result += characters.charAt(Math.floor(Math.random() * characters.length));
	}

	return result;
}

module.exports = genID;
