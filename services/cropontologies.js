const axios = require("axios");
const fs = require("fs");
const fetch = require("node-fetch");

async function modifyOntologies() {
	try {
		const rawData = await fs.readFileSync("./cropOntology.json");
		const jsonData = JSON.parse(rawData);

		const uniqueRecords = new Map();

		jsonData.forEach((record) => {
			const { ontologyName, term, observationVariableDbId } = record;

			if (!uniqueRecords.has(ontologyName)) {
				uniqueRecords.set(ontologyName, { ontologyName, terms: {} });
			}

			const ontology = uniqueRecords.get(ontologyName);

			if (!ontology.terms[term]) {
				ontology.terms[term] = {
					name: term,
					observationVariableDbId: new Set(),
				};
			}

			ontology.terms[term].observationVariableDbId.add(observationVariableDbId);
		});

		const finalData = Array.from(uniqueRecords.values()).map((ontology) => {
			const terms = {};
			for (const [term, data] of Object.entries(ontology.terms)) {
				terms[term] = {
					name: data.name,
					observationVariableDbId: Array.from(data.observationVariableDbId),
				};
			}
			return { ontologyName: ontology.ontologyName, terms };
		});

		console.log(JSON.stringify(finalData, null, 2));

		await fs.writeFileSync(
			"cleaned_data.json",
			JSON.stringify(finalData, null, 2)
		);

		console.log(
			'New JSON file "cleaned_data.json" has been created successfully.'
		);
	} catch (error) {
		console.error("Error processing JSON:", error);
	}
}

async function getAllOntologies() {
	const baseUrl = "http://127.0.0.1:5900/brapi/v2/variables";
	let results = [];

	for (let i = 998; i <= 1000; i++) {
		try {
			const response = await axios.get(`${baseUrl}?ontologyDbId=CO_${i}`);
			console.log(`Fetched CO_${i}`);

			let totalPages = response.data.metadata.pagination.totalPages;
			console.log(totalPages);


			for (let j = 0; j < totalPages; j++) {
				const response2 = await axios.get(`${baseUrl}?ontologyDbId=CO_${i}?page=${j}`);
				let pagedData = response2.data;

				console.log(pagedData.result);

				for (k = 0; k < pagedData.result.length; k++) {
					results.push({
						ontologyName: pagedData.result[0].ontologyName,
						term: pagedData.result[k].trait.class,
						observationVariableDbId:
							pagedData.result[k].observationVariableDbId,
						traitDbId: pagedData.result[k].trait.traitDbId,
						traitName: pagedData.result[k].trait.name,
						methodDbId: pagedData.result[k].method.methodDbId,
						methodName: pagedData.result[k].method.name,
						scaleDbId: pagedData.result[k].scale.scaleDbId,
						scaleName: pagedData.result[k].scale.name,
					});
				}
				console.log(results);
				console.log(j);
			}
		} catch (error) {
			console.log(`Skipping CO_${i}: Not Found`);
		}
	}

	fs.writeFileSync("cropOntology1.json", JSON.stringify(results, null, 2));
	return results;
}

module.exports = getAllOntologies;
