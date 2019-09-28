import { Component } from "@angular/core";

import { Map, Control, tileLayer, Marker, icon } from "leaflet";
import { ClimaServiceService } from "../services/clima-service.service";

import "leaflet-control-geocoder";

const iconRetinaUrl = "assets/icon/marker-icon-2x.png";
const iconUrl = "assets/icon/marker-icon.png";
const shadowUrl = "assets/icon/marker-shadow.png";

//Fix for Bug Icon when clicked in Map
const iconDefault = icon({
	iconRetinaUrl,
	iconUrl,
	shadowUrl,
	iconSize: [25, 41],
	iconAnchor: [12, 41],
	popupAnchor: [1, -34],
	tooltipAnchor: [16, -28],
	shadowSize: [41, 41]
});

Marker.prototype.options.icon = iconDefault;

@Component({
	selector: "app-home",
	templateUrl: "home.page.html",
	styleUrls: ["home.page.scss"]
})
export class HomePage {
	map: Map;
	search_address: string;
	geocoder: any;
	onMarked: any;
	nameCity: string;
	nameState: string;

	constructor(private climaTempo: ClimaServiceService) {}

	ionViewDidEnter() {
		this.leafletMap();
	}

	leafletMap() {
		this.map = new Map("map").setView([0, 0], 4);
		let map = this.map;

		//Define Geocode option for Google, this option require API_KEY
		this.geocoder = Control.Geocoder.google(
			"AIzaSyDs7nC7WEfLbE75yxhjrNSzJ2ldr7Td768"
		);

		let control = Control.geocoder({
			geocoder: this.geocoder
		}).addTo(this.map);

		//Add Event Handler for click and Mark in Map
		this.map.on("click", (e: Map) => {
			if (this.onMarked) {
				this.map.removeLayer(this.onMarked);
				this.onMarked = undefined;
			}

			this.geocoder.reverse(
				e.latlng,
				map.options.crs.scale(map.getZoom()),
				(results: any) => {
					let r = results[0];

					//Remove elements of city, to get element with id
					let zeroElementsCity = r.properties.map(e => {
						return e.types.filter(e => {
							return e === "administrative_area_level_2";
						});
					});

					zeroElementsCity.map((e, i) => {
						if (e.length > 0) {
							this.nameCity = r.properties[i].long_name;
						}
					});

					//Remove elements of state, to get element with id
					let zeroElementsState = r.properties.map(e => {
						return e.types.filter(e => {
							return e === "administrative_area_level_1";
						});
					});

					zeroElementsState.map((e, i) => {
						if (e.length > 0) {
							this.nameState = r.properties[i].short_name;
						}
					});

					console.log(this.nameCity);
					console.log(this.nameState);

					this.searchClima();

					if (r) {
						if (this.onMarked) {
							this.onMarked
								.setLatLng(r.center)
								.setPopupContent(r.html || r.name)
								.openPopup();
						} else {
							this.onMarked = new Marker(r.center)
								.bindPopup(r.name)
								.addTo(map)
								.openPopup();
						}
					}
				}
			);
		});

		tileLayer("https://{s}.tile.osm.org/{z}/{x}/{y}.png", {
			attribution:
				'&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
		}).addTo(this.map);
	}

	searchClima() {
		this.climaTempo
			.getIdCity(this.nameCity, this.nameState)
			.then((cityId: number) => {
				if (!this.verifyIdIsRegistred(cityId)) {
					this.registerCity(cityId);
				}

				if (cityId !== 0) {
					this.climaTempo.searchWeatherNow(cityId).then(
						res => {
							console.log(res.data);
						},
						error => {
							console.log(error);
						}
					);
				} else {
					console.log("Fora da API");
				}
			})
			.catch(err => console.log(err));
	}

	//This Method is for search StringField and Mark in Map
	searchAddress(data: any) {
		this.search_address = data.form.value.search_address;

		if (this.onMarked) {
			this.map.removeLayer(this.onMarked);
			this.onMarked = undefined;
		}

		this.geocoder.geocode(this.search_address, (results: any) => {
			let r = results[0];

			console.log(r.properties);

			//Remove elements of city, to get element with id
			let zeroElementsCity = r.properties.map(e => {
				return e.types.filter(e => {
					return e === "administrative_area_level_2";
				});
			});

			zeroElementsCity.map((e, i) => {
				if (e.length > 0) {
					this.nameCity = r.properties[i].long_name;
				}
			});

			//Remove elements of state, to get element with id
			let zeroElementsState = r.properties.map(e => {
				return e.types.filter(e => {
					return e === "administrative_area_level_1";
				});
			});

			zeroElementsState.map((e, i) => {
				if (e.length > 0) {
					this.nameState = r.properties[i].short_name;
				}
			});

			console.log(this.nameCity);
			console.log(this.nameState);

			this.searchClima();

			if (r) {
				if (this.onMarked) {
					this.onMarked
						.setLatLng(r.center)
						.setPopupContent(r.html || r.name)
						.openPopup();
				} else {
					this.onMarked = new Marker(r.center)
						.bindPopup(r.name)
						.addTo(this.map)
						.openPopup();
				}
			}
		});
	}

	verifyIdIsRegistred(idCity: number) {
		let isRegistred: Boolean;
		this.climaTempo.getAllIdRegistries().subscribe(registries => {
			isRegistred = registries.map(el => {
				return true ? el === idCity : false;
			});
			return isRegistred;
		});
		return isRegistred;
	}

	registerCity(idCity: number) {
		this.climaTempo.registerCityById(idCity.toLocaleString());
	}

	ionViewWillLeave() {
		this.map.remove();
	}
}
