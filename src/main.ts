import { Component, OnInit } from "@angular/core";
import { bootstrapApplication } from "@angular/platform-browser";
import { HttpClientModule, HttpClient } from "@angular/common/http";
import { latLng, tileLayer, GeoJSON } from "leaflet";
import { Map as LeafletMap } from "leaflet";
import { Layer } from "leaflet";
import { Feature } from "geojson";
import * as L from "leaflet";
import { CommonModule } from "@angular/common";

// Define color mapping for candidates and lead statuses
// Config for different election races with predefined colors for each status
const electionConfig: any = {
  president: {
    candidates: {
      candidatepresident1: {
        name: `Vonvon Mancos`,
        colors: { leading: "#ffd1d1", win: "red" },
      },
      candidatepresident2: {
        name: `Deni Lobredo`,
        colors: { leading: "#faffde", win: "yellow" },
      },
      candidatepresident3: {
        name: "Sana Turete",
        colors: { leading: "#d7ffd6", win: "green" },
      },
    },
  },
  // Additional races can be added here, each with their own candidates and colors
};

// Function to get the specific color based on race, candidate, and status
function getCandidateColor(
  race: "president" | "vicePresident" | "senators",
  candidateKey: string,
  status: "leading" | "win"
) {
  const raceConfig = electionConfig[race];
  return raceConfig.candidates[candidateKey].colors[status];
}

@Component({
  selector: "app-root",
  standalone: true,
  imports: [HttpClientModule, CommonModule],
  template: `
    <h4 style="text-align:center">
      <span
        class="flag-icon flag-icon-ph"
        style="font-size: 24px; margin-right: 5px;"
      ></span>
      Philippine Presidential Elections Interactive Map
      <span style="color:red">(Mock Random Data)</span>
    </h4>

    <!-- SVG pattern for striped fill with transparent gaps and white stripes -->
    <svg width="0" height="0" style="position: absolute;">
      <defs>
        <pattern
          id="striped-pattern"
          patternUnits="userSpaceOnUse"
          width="8"
          height="8"
        >
          <!-- White diagonal stripes, transparent background -->
          <path
            d="M-2,2 l4,-4 M0,8 l8,-8 M6,10 l4,-4"
            stroke="white"
            stroke-width="2"
          />
        </pattern>
      </defs>
    </svg>

    <!-- country:
    {{!currentCountryLayer? '': '*'}}

    &nbsp;&nbsp;&nbsp;Region:
    {{!currentRegionLayer? '': '*'}}
    {{currentRegionFeature?.id}}

    &nbsp;&nbsp;&nbsp;Province:
    {{!currentProvinceLayer? '': '*'}}
    {{currentProvinceFeature?.id}}

    &nbsp;&nbsp;&nbsp;MunCity:
    {{!currentMunCityLayer? '': '*'}}
    {{currentMunCityFeature?.id}}

    &nbsp;&nbsp;&nbsp;Barangay:
    {{!currentBarangayLayer? '': '*'}}
    {{currentBarangayFeature?.id}} -->

    <!-- <button
      *ngIf="currentProvinceLayer || currentRegionLayer || currentMunCityLayer" (click)="goUpLevel()"
    >Up One Level</button> -->

    <div id="map" style="height: 500px;"></div>

    <footer class="tech-footer">
      <p>
        Technologies Used: Leaflet v1.9.4, Angular v18.1.0, Font Awesome v6.0.0,
        Github/faeldon/philippines-json-maps
      </p>
      <!-- flag-icon-css v3.5.0 -->
      <p style="font-size: 0.7rem; color: #aaa">
        I built this project to explore interactive map visualizations, inspired
        by Google Maps' US Elections 2024. It focuses on Philippine elections
        and helped me dive deeper into Angular and Leaflet.
      </p>

      <p style="font-size: 0.7rem; color: #aaa">Last Updated: 2024-Nov-18</p>
    </footer>
  `,
  styleUrls: [],
})
export class App implements OnInit {
  map!: LeafletMap;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.initMap();
  }

  initMap() {
    const philippinesBounds = L.latLngBounds(
      L.latLng(4.5, 116.0), // Southwest corner (latitude, longitude)
      L.latLng(21.5, 127.0) // Northeast corner
    );

    this.map = new LeafletMap("map", {
      center: latLng(12.8797, 121.774), // Center of the Philippines
      zoom: 6,
      maxZoom: 15, // Maximum zoom level to prevent zooming out too far
      minZoom: 5, // Minimum zoom level to ensure focus on the Philippines
      zoomControl: false,
      layers: [
        tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "OpenStreetMap",
        }),
      ],
      maxBounds: philippinesBounds, // Restrict to Philippine bounds
      maxBoundsViscosity: 1.0, // Restrict dragging outside bounds
    });

    this.map.createPane("countryPane");
    this.map.createPane("regionPane");
    this.map.createPane("provincePane");
    this.map.createPane("munCityPane");
    this.map.createPane("barangayPane");

    this.map.on("click", () => {
      // this.resetHighlight('country');
      // this.resetHighlight('region');
      // this.resetHighlight('province');
      // this.resetHighlight('muncity');
      // this.resetHighlight('barangay');
    });

    this.map.fitBounds(philippinesBounds); // Fit the initial view to the bounds

    this.map.on("zoomend", () => {
      if (!philippinesBounds.contains(this.map.getCenter())) {
        this.map.panInsideBounds(philippinesBounds);
      }
    });

    this.loadGeoJsonData();

    this.addMapControl();
  }

  addMapControl() {
    this.addUpButtonControl();
    this.addBreadcrumbControl();
  }

  upButton: any;
  addUpButtonControl() {
    // Define the custom control
    const UpOneLevelControl = L.Control.extend({
      options: {
        position: "topleft", // Position of the control
      },
      onAdd: (map: L.Map) => {
        // Create a container for the control
        const container = L.DomUtil.create(
          "div",
          "leaflet-bar leaflet-control leaflet-control-custom"
        );

        // Create a button element
        const button = L.DomUtil.create("a", "", container);
        button.innerHTML = '<i class="fas fa-arrow-up"></i>';
        button.href = "#";
        button.title = "Up One Level";

        // Set the initial disabled state based on the current layer
        button.classList.add("disabled"); // Add a CSS class for

        // Prevent map interactions when clicking the button
        L.DomEvent.disableClickPropagation(container);

        // Define the action on button click
        L.DomEvent.on(button, "click", (e) => {
          L.DomEvent.stopPropagation(e);
          L.DomEvent.preventDefault(e);

          this.goUpLevel();
        });

        // Store the button reference for dynamic updates
        this.upButton = button;

        return container;
      },
    });

    // Add the custom control to the map
    this.map.addControl(new UpOneLevelControl());
  }

  breadcrumbControl: L.Control | null = null; // Properly typed control
  addBreadcrumbControl() {
    // Remove any existing breadcrumb control
    if (this.breadcrumbControl) {
      this.map.removeControl(this.breadcrumbControl);
      this.breadcrumbControl = null; // Clear the reference
    }

    // Define the breadcrumb control
    const BreadcrumbControl = L.Control.extend({
      options: {
        position: "topright", // Adjust position as needed
      },
      onAdd: () => {
        // Create the breadcrumb container
        const container = L.DomUtil.create(
          "div",
          "leaflet-bar leaflet-control leaflet-control-breadcrumb"
        );

        // Generate the breadcrumb HTML
        container.innerHTML = this.getBreadcrumbHTML();

        // Add click handlers for breadcrumb links
        const links = container.querySelectorAll(
          ".breadcrumb-item[data-index]"
        );
        links.forEach((link) => {
          link.addEventListener("click", (e) => {
            e.preventDefault();
            const index = parseInt(
              (link as HTMLElement).getAttribute("data-index") || "0",
              10
            );
            this.navigateToBreadcrumbLevel(index);
          });
        });

        return container;
      },
    });

    // Create an instance of the breadcrumb control
    this.breadcrumbControl = new BreadcrumbControl();

    // Add the control instance to the map
    this.map.addControl(this.breadcrumbControl);
  }

  loadGeoJsonData() {
    this.loadCountry();
  }

  /////////////////// the COUNTRY and its regions
  currentCountryLayer: L.LayerGroup | undefined;
  loadCountry() {
    // Load the Philippines GeoJSON file with all regions
    this.http
      .get(
        "https://raw.githubusercontent.com/faeldon/philippines-json-maps/refs/heads/master/2023/geojson/country/lowres/country.0.001.json"
      )
      .subscribe((geoJsonData: any) => {
        // Clear existing province layers
        this.clearCountryLayer();

        const countryLayer = L.geoJSON(geoJsonData, {
          pane: "countryPane",
          style: {
            color: "white",
            weight: 2,
            // fillOpacity: 0.2,
          },
          onEachFeature: (feature, layer) => {
            const voteData = this.generateVoteRandom(feature);

            const popupContent = `
              <strong>Region:</strong> ${feature?.properties?.adm1_en}<br>
              <br>
              ${voteData.candidates
                .map(
                  (candidate, index) => `
                  ${
                    index === 0
                      ? `<strong>${candidate.name}</strong>`
                      : candidate.name
                  }: ${candidate.votes} votes (${candidate.percentage}%)<br>
                `
                )
                .join("")}
              <br/>
              ${voteData.reportingPercentage}% reporting
            `;

            // <strong>Total Votes:</strong> ${voteData.totalVotes}<br>

            // Bind popup with the vote data
            layer.bindPopup(popupContent);

            // Bind the tooltip with the place name and set it to always display
            layer.bindTooltip(
              this.extractShortName(feature?.properties?.adm1_en),
              {
                permanent: true, // Keep it visible without hover
                direction: "center", // Center the text within the shape
                className: "place-label region-label", // Custom class for styling
              }
            );

            // Apply color styling based on the leading candidate's status
            if (layer instanceof L.Path) {
              const isFinal = voteData.reportingPercentage === 100;
              const fillColor = isFinal
                ? electionConfig.president.candidates[voteData.leadingCandidate]
                    .colors.win
                : electionConfig.president.candidates[voteData.leadingCandidate]
                    .colors.leading;

              layer.setStyle({
                // Use solid color for final results, striped pattern for in-progress
                fillColor: fillColor,
                fillOpacity: 1, // Adjust as needed for visibility
                // color: voteData.leadingColor,      // Border color
                weight: 2, // Border thickness
              });
            }

            layer.on("click", () => {
              this.loadRegion(feature);
              this.highlightLayer(layer, "region");
            });
          },
        }).addTo(this.map);

        // Apply shadow to the whole layer by targeting the pane
        this.map.getPane("countryPane")?.classList.add("leaflet-layer-shadow");

        // Center and zoom the map to fit the country's bounds
        const bounds = countryLayer.getBounds(); // Get the bounding box of the GeoJSON layer
        this.map.fitBounds(bounds, {
          padding: [20, 20], // Optional padding around the edges
        });

        // Store the province layer to manage it later
        this.currentCountryLayer = countryLayer;

        this.addBreadcrumbControl();
        this.enableUpButton(false);
      });
  }

  enableUpButton(enable = true) {
    if (this.upButton) {
      if (enable) {
        this.upButton.classList.remove("disabled");
      } else {
        this.upButton.classList.add("disabled");
      }
    }
  }

  navigateToBreadcrumbLevel(levelIndex: number) {
    if (levelIndex < 1) {
      // Reset to the country level
      this.loadCountry();
    } else if (levelIndex === 1) {
      // Reset to the region level
      this.loadRegion(this.currentRegionFeature);
    } else if (levelIndex === 2) {
      // Reset to the province level
      this.loadProvince(this.currentProvinceFeature);
    } else if (levelIndex === 3) {
      // Reset to the municipality/city level
      this.loadMunCity(this.currentMunCityFeature);
    }
  }

  extractShortName(fullRegionName: string): string {
    // Check if there's an acronym in parentheses
    const acronymMatch = fullRegionName.match(/\(([^)]+)\)/);
    if (acronymMatch) {
      return acronymMatch[1]; // Return the acronym within the parentheses
    }

    // If no acronym, generate a short name using the first letters of each word
    return fullRegionName
      .split(" ")
      .map((word) => word[0].toUpperCase()) // Take the first letter of each word
      .join(""); // Combine letters
  }

  createStripedPattern(color: string): string {
    const svgNS = "http://www.w3.org/2000/svg";
    const patternId = `striped-pattern-${color.replace("#", "")}`; // Unique ID based on color

    // Check if the pattern already exists
    if (document.getElementById(patternId)) {
      return `url(#${patternId})`;
    }

    // Create the pattern element
    const pattern = document.createElementNS(svgNS, "pattern");
    pattern.setAttribute("id", patternId);
    pattern.setAttribute("patternUnits", "userSpaceOnUse");
    pattern.setAttribute("width", "8");
    pattern.setAttribute("height", "8");

    // Create the path element for stripes with specified color
    const path = document.createElementNS(svgNS, "path");
    path.setAttribute("d", "M-2,2 l4,-4 M0,8 l8,-8 M6,10 l4,-4");
    path.setAttribute("stroke", color); // Use the custom color here for the stripes
    path.setAttribute("stroke-width", "2");

    // Append the path to the pattern
    pattern.appendChild(path);

    // Append the pattern to the SVG defs
    const defs =
      document.querySelector("svg defs") ||
      document.createElementNS(svgNS, "defs");
    defs.appendChild(pattern);

    // Ensure defs are in the SVG element in the DOM
    let svg = document.querySelector("svg");
    if (!svg) {
      svg = document.createElementNS(svgNS, "svg");
      svg.setAttribute("width", "0");
      svg.setAttribute("height", "0");
      svg.style.position = "absolute";
      svg.appendChild(defs);
      document.body.appendChild(svg);
    }

    return `url(#${patternId})`;
  }

  generateVoteRandom(feature: any, finalProbability = 0.3) {
    // Determine if results should be final based on the provided probability
    const isFinal = Math.random() < finalProbability;

    const race = "president";
    const maxVotes = 10000; // Maximum possible votes per candidate

    const reportingPercentage = isFinal ? 100 : Math.floor(Math.random() * 101);

    // Extract candidates from the election config for the specified race
    const candidatesConfig = electionConfig[race].candidates;
    const candidateKeys = Object.keys(candidatesConfig); // Ensure we're only using existing keys

    // Generate random votes for each candidate
    let candidateVotes = candidateKeys.map((candidateKey) => ({
      candidateKey,
      name: candidatesConfig[candidateKey].name,
      votes: Math.floor(Math.random() * maxVotes),
    }));

    // Sort candidates by vote count in descending order
    candidateVotes.sort((a, b) => b.votes - a.votes);

    // Calculate total votes and percentages for the top 3 candidates
    const totalVotes = candidateVotes.reduce(
      (sum, candidate) => sum + candidate.votes,
      0
    );

    const topCandidates = candidateVotes.slice(0, 3).map((candidate) => ({
      ...candidate,
      percentage: ((candidate.votes / totalVotes) * 100).toFixed(2), // Calculate vote percentage
    }));

    // Set the leading candidate key based on the highest votes
    const leadingCandidateKey = topCandidates[0].candidateKey;

    // Ensure final votes if isFinal is true
    if (isFinal) {
      const totalFinalVotes = 100000; // Adjust total votes for final reporting
      const finalVoteDistribution = [0.52, 0.35, 0.13]; // Example distribution

      topCandidates.forEach((candidate, index) => {
        candidate.votes = Math.floor(
          finalVoteDistribution[index] * totalFinalVotes
        );
        candidate.percentage = (
          (candidate.votes / totalFinalVotes) *
          100
        ).toFixed(2);
      });
    }

    return {
      candidates: topCandidates,
      totalVotes,
      reportingPercentage,
      leadingCandidate: leadingCandidateKey, // The key of the leading candidate
    };
  }

  // Helper to clear previous province layers
  clearCountryLayer() {
    if (this.currentCountryLayer) {
      this.map.removeLayer(this.currentCountryLayer);
    }
    this.clearRegionLayer();
  }

  //////////////////// the REGION and its provinces
  currentRegionFeature?: Feature;
  currentRegionLayer: L.LayerGroup | undefined;
  loadRegion(regionFeature: any) {
    // Load province data for the selected region
    const regionCode = regionFeature.id; // Adjust if different property

    // Construct the path to the province data file based on regionCode
    const filePath = `https://raw.githubusercontent.com/faeldon/philippines-json-maps/refs/heads/master/2023/geojson/regions/hires/provdists-region-${regionCode}.0.1.json`;

    this.http.get(filePath).subscribe((geoJsonData: any) => {
      // Clear existing province layers
      this.clearRegionLayer();

      // Add provinces to the map
      const regionLayer = L.geoJSON(geoJsonData, {
        pane: "regionPane",
        style: {
          color: "white",
          weight: 2,
        },
        onEachFeature: (feature, layer) => {
          // Generate random vote data for the province
          const voteData = this.generateVoteRandom(feature);

          // Define popup content with vote data
          const popupContent = `
            <strong>Province:</strong> ${feature?.properties?.adm2_en}<br>
            <br>
            ${voteData.candidates
              .map(
                (candidate, index) => `
                ${
                  index === 0
                    ? `<strong>${candidate.name}</strong>`
                    : candidate.name
                }: ${candidate.votes} votes (${candidate.percentage}%)<br>
              `
              )
              .join("")}
            <br/>
            ${voteData.reportingPercentage}% reporting
          `;

          // Bind popup with the vote data
          layer.bindPopup(popupContent);

          // Apply color styling based on the leading candidate's status
          if (layer instanceof L.Path) {
            const isFinal = voteData.reportingPercentage === 100;
            const fillColor = isFinal
              ? electionConfig.president.candidates[voteData.leadingCandidate]
                  .colors.win
              : electionConfig.president.candidates[voteData.leadingCandidate]
                  .colors.leading;

            layer.setStyle({
              // Use solid color for final results, striped pattern for in-progress
              fillColor: fillColor,
              fillOpacity: 1, // Adjust as needed for visibility
              // color: voteData.leadingColor,      // Border color
              weight: 2, // Border thickness
            });
          }

          // Bind the tooltip with the place name and set it to always display
          layer.bindTooltip(feature?.properties?.adm2_en, {
            permanent: true, // Keep it visible without hover
            direction: "center", // Center the text within the shape
            className: "place-label province-label", // Custom class for styling
          });

          layer.on("click", () => {
            this.loadProvince(feature);
            this.highlightLayer(layer, "province");
          });
        },
      }).addTo(this.map);

      // Apply shadow to the whole layer by targeting the pane
      this.map.getPane("regionPane")?.classList.add("leaflet-layer-shadow");

      // Store the region and region layer for later reference
      this.currentRegionFeature = regionFeature;
      this.currentRegionLayer = regionLayer;

      // Zoom into the clicked region
      const bounds = L.geoJSON(regionFeature).getBounds();
      this.map.fitBounds(bounds);

      this.addBreadcrumbControl();
      this.enableUpButton();
    });
  }

  // Helper to clear previous province layers
  clearRegionLayer() {
    if (this.currentRegionLayer) {
      this.map.removeLayer(this.currentRegionLayer);
    }
    this.currentRegionFeature = undefined;
    this.clearProvinceLayer();
  }

  //////////////////// the PROVINCE and its municipalities/cities
  currentProvinceFeature?: Feature;
  currentProvinceLayer: L.LayerGroup | undefined;
  loadProvince(provinceFeature: any) {
    // Load municipality/city data for the selected province
    const provinceCode = provinceFeature.id; // Adjust if different property

    // Construct the path to the municipalities data file based on provinceCode
    const filePath = `https://raw.githubusercontent.com/faeldon/philippines-json-maps/refs/heads/master/2023/geojson/provdists/hires/municities-provdist-${provinceCode}.0.1.json`;

    this.http.get(filePath).subscribe((geoJsonData: any) => {
      // Clear existing municipality layers
      this.clearProvinceLayer();

      // Add municipalities/cities to the map
      const provinceLayer = L.geoJSON(geoJsonData, {
        pane: "provincePane",
        style: {
          color: "white",
          weight: 2,
        },
        onEachFeature: (feature, layer) => {
          // Generate random vote data for the municipality/city
          const voteData = this.generateVoteRandom(feature);

          // Define popup content with vote data
          const popupContent = `
            <strong>Municipality/City:</strong> ${
              feature?.properties?.adm3_en
            }<br>
            <br>
            ${voteData.candidates
              .map(
                (candidate, index) => `
                ${
                  index === 0
                    ? `<strong>${candidate.name}</strong>`
                    : candidate.name
                }: ${candidate.votes} votes (${candidate.percentage}%)<br>
              `
              )
              .join("")}
            <br/>
            ${voteData.reportingPercentage}% reporting
          `;

          // Bind popup with the vote data
          layer.bindPopup(popupContent);

          // Apply color styling based on the leading candidate's status
          if (layer instanceof L.Path) {
            const isFinal = voteData.reportingPercentage === 100;
            const fillColor = isFinal
              ? electionConfig.president.candidates[voteData.leadingCandidate]
                  .colors.win
              : electionConfig.president.candidates[voteData.leadingCandidate]
                  .colors.leading;

            layer.setStyle({
              // Use solid color for final results, striped pattern for in-progress
              fillColor: fillColor,
              fillOpacity: 1, // Adjust as needed for visibility
              // color: voteData.leadingColor,      // Border color
              weight: 2, // Border thickness
            });
          }

          const geoLevel = feature?.properties?.geo_level;
          const labelClass =
            geoLevel === "Mun"
              ? "mun-label"
              : geoLevel === "City"
              ? "city-label"
              : "";

          // Bind the tooltip with the place name and set it to always display
          layer.bindTooltip(feature?.properties?.adm3_en, {
            permanent: true, // Keep it visible without hover
            direction: "center", // Center the text within the shape
            className: `place-label ${labelClass}`, // Custom class for styling
          });

          layer.on("click", () => {
            this.loadMunCity(feature);
            this.highlightLayer(layer, "muncity");
          });
        },
      }).addTo(this.map);

      // Apply shadow to the whole layer by targeting the pane
      this.map.getPane("provincePane")?.classList.add("leaflet-layer-shadow");

      // Store the province and province layer for later reference
      this.currentProvinceFeature = provinceFeature;
      this.currentProvinceLayer = provinceLayer;

      // Zoom into the clicked province
      const bounds = L.geoJSON(provinceFeature).getBounds();
      this.map.fitBounds(bounds);

      this.addBreadcrumbControl();
      this.enableUpButton();
    });
  }

  // Helper to clear previous province layers
  clearProvinceLayer() {
    if (this.currentProvinceLayer) {
      this.map.removeLayer(this.currentProvinceLayer);
    }
    this.currentProvinceFeature = undefined;
    this.clearMunCityLayer();
  }

  //////////////////// the MUNICIPALITIES/CITIES and its Barangays
  currentMunCityFeature?: Feature;
  currentMunCityLayer: L.LayerGroup | undefined;
  loadMunCity(munCityFeature: any) {
    // Load barangay data for the selected munCity
    const munCityCode = munCityFeature.id; // Adjust if different property

    // Construct the path to the barangay data file based on munCityCode
    const filePath = `https://raw.githubusercontent.com/faeldon/philippines-json-maps/refs/heads/master/2023/geojson/municities/hires/bgysubmuns-municity-${munCityCode}.0.1.json`;

    this.http.get(filePath).subscribe((geoJsonData: any) => {
      // Clear existing barangay layers
      this.clearMunCityLayer();

      // Add barangays to the map
      const munCityLayer = L.geoJSON(geoJsonData, {
        pane: "munCityPane",
        style: {
          color: "white",
          weight: 2,
        },
        onEachFeature: (feature, layer) => {
          // Generate random vote data for the barangay
          const voteData = this.generateVoteRandom(feature);

          // Define popup content with vote data
          const popupContent = `
            <strong>Barangay:</strong> ${feature?.properties?.adm4_en}<br>
            <br>
            ${voteData.candidates
              .map(
                (candidate, index) => `
                ${
                  index === 0
                    ? `<strong>${candidate.name}</strong>`
                    : candidate.name
                }: ${candidate.votes} votes (${candidate.percentage}%)<br>
              `
              )
              .join("")}
            <br/>
            ${voteData.reportingPercentage}% reporting
          `;

          // Bind popup with the vote data
          layer.bindPopup(popupContent);

          // Apply color styling based on the leading candidate's status
          if (layer instanceof L.Path) {
            const isFinal = voteData.reportingPercentage === 100;
            const fillColor = isFinal
              ? electionConfig.president.candidates[voteData.leadingCandidate]
                  .colors.win
              : electionConfig.president.candidates[voteData.leadingCandidate]
                  .colors.leading;

            layer.setStyle({
              // Use solid color for final results, striped pattern for in-progress
              fillColor: fillColor,
              fillOpacity: 1, // Adjust as needed for visibility
              // color: voteData.leadingColor,      // Border color
              weight: 2, // Border thickness
            });
          }

          // Bind the tooltip with the place name and set it to always display
          layer.bindTooltip(feature?.properties?.adm4_en, {
            permanent: true, // Keep it visible without hover
            direction: "center", // Center the text within the shape
            className: "place-label barangay-label", // Custom class for styling
          });

          layer.on("click", () => {
            this.loadBarangay(feature);
            // this.highlightLayer(layer, 'barangay');
          });
        },
      }).addTo(this.map);

      // Apply shadow to the whole layer by targeting the pane
      this.map.getPane("munCityPane")?.classList.add("leaflet-layer-shadow");

      // Store the munCity and munCity layer for later reference
      this.currentMunCityFeature = munCityFeature;
      this.currentMunCityLayer = munCityLayer;

      // Zoom into the clicked munCity
      const bounds = L.geoJSON(munCityFeature).getBounds();
      this.map.fitBounds(bounds);

      this.addBreadcrumbControl();
      this.enableUpButton();
    });
  }

  // Helper to clear previous MunCity layers
  clearMunCityLayer() {
    if (this.currentMunCityLayer) {
      this.map.removeLayer(this.currentMunCityLayer);
    }
    this.currentMunCityFeature = undefined;
    this.clearBarangayLayer();
  }

  /////////// BARANGAY
  currentBarangayFeature?: Feature;
  currentBarangayLayer: L.LayerGroup | undefined;
  loadBarangay(barangayFeature: Feature) {
    // this.clearBarangayLayer();
    // this.currentBarangayFeature = barangayFeature;
    // Apply shadow to the whole layer by targeting the pane
    // this.map.getPane('barangayPane')?.classList.add('leaflet-layer-shadow');
  }

  clearBarangayLayer() {
    this.currentBarangayFeature = undefined;
  }

  // Function to highlight a clicked layer and dim layers of higher levels
  highlightedLayer: L.Layer | undefined;
  highlightLayer(
    clickedLayer: L.Layer,
    layerType: "country" | "region" | "province" | "muncity" | "barangay"
  ) {
    const dimColor = "red";
    const dimOpacity = 0.3;
    const dimFillOpacity = 0.4;

    // Define a hierarchy of layers with their types
    const layers = {
      country: this.currentCountryLayer,
      region: this.currentRegionLayer,
      province: this.currentProvinceLayer,
      muncity: this.currentMunCityLayer,
      barangay: this.currentBarangayLayer,
    };

    // Reset previous highlight
    this.resetHighlight(layerType);

    // Dim all layers except the selected one
    (Object.keys(layers) as Array<keyof typeof layers>).forEach((type) => {
      if (type !== layerType && layers[type]) {
        layers[type]!.eachLayer((layer: any) => {
          layer.setStyle({
            weight: 1,
            opacity: dimOpacity,
            fillOpacity: dimFillOpacity,
          });
        });
      }
    });

    // Highlight the clicked layer
    // if (clickedLayer instanceof L.Path) {
    //   clickedLayer.setStyle({
    //     weight: 3,
    //     opacity: 1,
    //     fillOpacity: 0.6, // Adjust highlight opacity as needed
    //   });
    // }

    // Track the currently highlighted layer
    this.highlightedLayer = clickedLayer;
  }

  // Function to reset the highlight of a specific layer type
  resetHighlight(
    layerType: "country" | "region" | "province" | "muncity" | "barangay"
  ) {
    if (layerType === "country" && this.currentCountryLayer) {
      this.currentCountryLayer.eachLayer((layer: any) => {
        layer.setStyle({
          weight: 2,
          fillOpacity: 0.2,
        });
      });
    } else if (layerType === "region" && this.currentRegionLayer) {
      this.currentRegionLayer.eachLayer((layer: any) => {
        layer.setStyle({
          weight: 2,
          fillOpacity: 0.2,
        });
      });
    } else if (layerType === "province" && this.currentProvinceLayer) {
      this.currentProvinceLayer.eachLayer((layer: any) => {
        layer.setStyle({
          weight: 2,
          fillOpacity: 0.2,
        });
      });
    } else if (layerType === "muncity" && this.currentMunCityLayer) {
      this.currentMunCityLayer.eachLayer((layer: any) => {
        layer.setStyle({
          weight: 2,
          fillOpacity: 0.2,
        });
      });
    }
  }

  goUpLevel() {
    if (this.currentBarangayFeature) {
      this.loadMunCity(this.currentMunCityFeature);
    } else if (this.currentMunCityFeature) {
      this.loadProvince(this.currentProvinceFeature);
    } else if (this.currentProvinceFeature) {
      this.loadRegion(this.currentRegionFeature);
    } else if (this.currentRegionFeature) {
      this.loadCountry();
    }
  }

  getBreadcrumbHTML(): string {
    const levels = [
      { name: "Philippines", feature: null }, // Root level
      {
        name: this.currentRegionFeature?.properties?.["adm1_en"],
        feature: this.currentRegionFeature,
      },
      {
        name: this.currentProvinceFeature?.properties?.["adm2_en"],
        feature: this.currentProvinceFeature,
      },
      {
        name: this.currentMunCityFeature?.properties?.["adm3_en"],
        feature: this.currentMunCityFeature,
      },
      {
        name: this.currentBarangayFeature?.properties?.["adm4_en"],
        feature: this.currentBarangayFeature,
      },
    ];

    return levels
      .filter((level) => level.feature || level.name === "Philippines") // Always include 'Philippines'
      .map((level, index) => {
        if (index < levels.length - 1 || level.name === "Philippines") {
          // Make "Philippines" and all other levels clickable
          return `<a href="#" class="breadcrumb-item" data-index="${index}">${level.name}</a>`;
        }
        return `<span class="breadcrumb-item">${level.name}</span>`;
      })
      .join(" > ");
  }
}

bootstrapApplication(App);
