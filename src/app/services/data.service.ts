import { Injectable } from "@angular/core";
import { Subject, Observable } from "rxjs";

@Injectable({
	providedIn: "root"
})
export class DataService {
	private data = [];

	constructor() {}

	setData(id: string, data: any) {
		this.data[id] = data;
	}

	getData(id: string) {
		return this.data[id];
	}
}
