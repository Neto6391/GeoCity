import { Component } from "@angular/core";
import { Map, Control, tileLayer, marker } from "leaflet";
import "leaflet-control-geocoder";

@Component({
	selector: "app-home",
	templateUrl: "home.page.html",
	styleUrls: ["home.page.scss"]
})
export class HomePage {
	map: Map;

	ionViewDidEnter() {
		this.leafletMap();
	}

	leafletMap() {
		this.map = new Map("map").setView([0, 0], 4);
		let map = this.map;

		//Define Geocode option for Google, this option require API_KEY
		let geocoder = Control.Geocoder.google(
			"AIzaSyDs7nC7WEfLbE75yxhjrNSzJ2ldr7Td768"
		);

		if (URLSearchParams && location.search) {
			let params = new URLSearchParams(location.search);
			let geocoderString = params.get("geocoder");
			if (geocoderString && Control.Geocoder[geocoderString]) {
				console.log("Using geocoder", geocoderString);
				geocoder = Control.Geocoder[geocoderString]();
			} else if (geocoderString) {
				console.warn("Unsupported geocoder", geocoderString);
			}
		}

		let control = Control.geocoder({
			geocoder: geocoder
		}).addTo(this.map);
		let onMarked: any;

		//Add Event Handler for click
		this.map.on("click", (e: Map) => {
			console.log(e.target.options.crs);
			geocoder.reverse(
				e.latlng,
				map.options.crs.scale(map.getZoom()),
				(results: any) => {
					let r = results[0];
					console.log(r);
					if (r) {
						if (onMarked) {
							onMarked
								.setLatLng(r.center)
								.setPopupContent(r.html || r.name)
								.openPopup();
						} else {
							onMarked = marker(r.center)
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

	ionViewWillLeave() {
		this.map.remove();
	}
}
