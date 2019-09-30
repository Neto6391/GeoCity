import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import moment from "moment";

import { DataService } from "../services/data.service";
import { Subscription } from "rxjs";

@Component({
	selector: "app-weather",
	templateUrl: "./weather.page.html",
	styleUrls: ["./weather.page.scss"]
})
export class WeatherPage implements OnInit {
	data: any;
	error: any;
	date: [];
	dataUpdatedEvent: Subscription;

	constructor(
		private route: ActivatedRoute,
		private router: Router,
		private dataService: DataService
	) {}

	ngOnInit() {
		this.loadData();
	}

	loadData() {
		if (this.route.snapshot.data["data"]) {
			let splitDateString: any;

			this.data = this.route.snapshot.data["data"];
			if (!this.data.error) {
				//Reverse Date String and transform for date object
				splitDateString = this.data.data.date.split(" ");
				splitDateString[0] = moment(splitDateString, "YYYY-MM-DD").toDate();

				let month: string =
					splitDateString[0].getMonth() + 1 > 9
						? splitDateString[0].getMonth() + 1
						: "0" + (splitDateString[0].getMonth() + 1);

				splitDateString[0] =
					splitDateString[0].getDate().toString() +
					"/" +
					month +
					"/" +
					splitDateString[0].getFullYear();

				this.date = splitDateString;
			} else {
				this.error = this.data.error;
			}
		} else {
			this.error = "Sem Dados!";
		}
	}

	ionViewCanLeave() {
		this.data = null;
		this.error = null;
	}
}
