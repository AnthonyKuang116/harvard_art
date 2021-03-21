const BASE_URL = "https://api.harvardartmuseums.org";
const KEY = "apikey=4c96631e-1eb0-4afe-a35d-2ef050c444dd";

//fetches the data from our BASE_URL and our KEY
async function fetchObjects() {
  const url = `${BASE_URL}/object?${KEY}`;
  try {
    const response = await fetch(url);
    const data = await response.json();

    return data;
  } catch (error) {
    console.error(error);
  }
}

//Fetches the category list of century
//Stores the records during our first fetch and use those fetched records if we visit it again
async function fetchAllCenturies() {
  const century_URL = `${BASE_URL}/century?${KEY}&size=100&sort=temporalorder`;

  if (localStorage.getItem("centuries")) {
    return JSON.parse(localStorage.getItem("centuries"));
  }
  try {
    const response = await fetch(century_URL);
    const data = await response.json();
    const records = data.records;

    localStorage.setItem("centuries", JSON.stringify(records));

    return records;
  } catch (error) {
    console.error(error);
  }
}

//Fetches the category list of classifications
//Stores the records during our first fetch and use those fetched records if we visit it again
async function fetchAllClassifications() {
  const allClassifications_URL = `${BASE_URL}/classification?${KEY}&size=100&sort=name`;

  if (localStorage.getItem("classifications")) {
    return JSON.parse(localStorage.getItem("classifications"));
  }
  try {
    const response = await fetch(allClassifications_URL);
    const data = await response.json();
    const records = data.records;

    localStorage.setItem("classifications", JSON.stringify(records));

    return records;
  } catch (error) {
    console.error(error);
  }
}

//Renders the dropdown for the two categories above
async function prefetchCategoryLists() {
  try {
    const [classifications, centuries] = await Promise.all([
      fetchAllClassifications(),
      fetchAllCenturies(),
    ]);

    // This provides a clue to the user, that there are items in the dropdown
    $(".classification-count").text(`(${classifications.length})`);
    classifications.forEach(({ name }) => {
      $("#select-classification").append(
        `<option value="${name}">${name}</option>`
      );
    });

    // This provides a clue to the user, that there are items in the dropdown
    $(".century-count").text(`(${centuries.length}))`);
    centuries.forEach(({ name }) => {
      $(`<option value=${name}>${name}</option>`);
      $("#select-century").append($(`<option value=${name}>${name}</option>`));
    });
  } catch (error) {
    console.error(error);
  }
}
prefetchCategoryLists();

//Searches using the fields in the categories
$("#search").on("submit", async function (event) {
  event.preventDefault();
  onFetchStart();
  try {
    const response = await fetch(buildSearchString());
    const data = await response.json();
    updatePreview(data.records, data);
    return data;
  } catch (error) {
    console.error(error);
  } finally {
    onFetchEnd();
  }
});

//Builds the new URL with the categorie selections
function buildSearchString() {
  const selectClass = $("#select-classification").val();
  const selectCent = $("#select-century").val();
  const selectKey = $("#keywords").val();
  const searchString = `${BASE_URL}/object?${KEY}&classification=${selectClass}&century=${selectCent}&keyword=${selectKey}`;
  return encodeURI(searchString);
}

//Adds class "active" to #loading for when a clickable element is used and renders a loading modal
function onFetchStart() {
  $("#loading").addClass("active");
}
//Removes class "active" to #loading for when a clickable element is used and remvoes the modal
function onFetchEnd() {
  $("#loading").removeClass("active");
}

//Renders the left most div element with class name "object-preview"
function renderPreview(record) {
  const { description, primaryimageurl, title } = record;
  const prevRender = $(`
    <div class="object-preview">
      <a href="#">
        ${
          primaryimageurl === undefined || primaryimageurl === null
            ? ""
            : `<img src="${primaryimageurl}"/>`
        }
        ${title === undefined || title == null ? "" : `<h3>${title}</h3>`}
        ${
          description === undefined || description === null
            ? ""
            : `<h3>${description}</h3>`
        }
      </a>
    </div>`);
  return prevRender.data("record", record);
}

//Updates the preview.
//Checks if there is a page ahead or page behind the current one to enable a Next or Previous button accordingly
function updatePreview(records, data) {
  const {
    info,
    info: { next },
    info: { prev },
  } = data;
  const root = $("#preview .results");
  root.empty();

  //Checks if there is a next page and enables/disables the buttons accordingly
  if ("next" in info) {
    $(".next").data("data", next);
    $(".next").prop("disabled", false);
  } else {
    $(".next").data("data", null);
    $(".next").prop("disabled", true);
  }

  //Checks if there is a previous page and enables/disables the buttons accordingly
  if ("prev" in info) {
    $(".previous").data("data", prev);
    $(".previous").prop("disabled", false);
  } else {
    $(".previous").data("data", null);
    $(".previous").prop("disabled", true);
  }

  records.forEach(function (preview) {
    root.append(renderPreview(preview));
  });
}

//Fetches the next/previous data set when the next/previous button is clicked and renders it in the preview
$("#preview .next, #preview .previous").on("click", async function () {
  onFetchStart();
  try {
    const updateNext = $(this).data("data");
    const response = await fetch(updateNext);
    const data = await response.json();

    updatePreview(data.records, data);
    return data;
  } catch (error) {
    console.error(error);
  } finally {
    onFetchEnd();
  }
});

//When an element from object preview is clicked, renders it in the middle of the screen (#feature)
$("#preview").on("click", ".object-preview", function (event) {
  event.preventDefault(); // they're anchor tags, so don't follow the link
  const parent = $(this);
  const grabbedEle = parent.data("record");
  renderFeature(grabbedEle);
});

//Renders the data grabbed from the element in ".object-preview" into the "#feature" div
function renderFeature(record) {
  const {
    title,
    dated,
    description,
    culture,
    style,
    technique,
    medium,
    dimensions,
    people,
    department,
    division,
    contact,
    creditline,
    images,
    primaryimageurl,
  } = record;
  $("#feature").empty();
  const render = $(`<div class="object-feature">
    <header>
      <h3>${title}</h3>
      <h4>${dated}</h4>
    </header>
    <section class="facts">
      ${factHTML("Description", description)}
      ${factHTML("Culture", culture, "culture")}
      ${factHTML("Style", style)}
      ${factHTML("Technique", technique, "technique")}
      ${factHTML("Medium", medium, "medium")}
      ${factHTML("Dimensions", dimensions)}
      ${
        people
          ? people
              .map(({ displayname }) =>
                factHTML("People", displayname, "person")
              )
              .join("")
          : ""
      }
      ${factHTML("Department", department)}
      ${factHTML("Division", division)}
      ${factHTML(
        "Contact",
        `<a target="_blank" href="mailto:${contact}">${contact}</a>`
      )}
      ${factHTML("Credit", creditline)}
    </section>
    <section class="photos">
      ${photosHTML(images, primaryimageurl)}
    </section>
  </div>`);
  $("#feature").append(render);
}

//builds search string for when a clickable event inside #feature is clicked
function searchURL(searchType, searchString) {
  return encodeURI(`${BASE_URL}/object?${KEY}&${searchType}=${searchString}`);
}

//helper function for renderFeature that checks if content exists and renders the data accordingly
function factHTML(title, content, searchTerm = null) {
  // if content is empty or undefined, return an empty string ''
  if (content === "" || content === undefined || content === null) {
    return "";
  }
  // otherwise, if there is no searchTerm, return the two spans
  else if (searchTerm === null) {
    return `<span class="title">${title}</span><span class="content">${content}</span>`;
  }
  // otherwise, return the two spans, with the content wrapped in an anchor tag
  else {
    return `<span class="title">${title}</span><span class="content"><a href="${searchURL(
      searchTerm,
      content
    )}">${content}</a></span>`;
  }
}

//Helper function used in renderFeature that renders an image next to factHTML when applicable
function photosHTML(images, primaryimageurl) {
  if (images !== undefined && images !== null && images.length > 0) {
    return images
      .map(function (img) {
        return `<img src="${img.baseimageurl}"/>`;
      })
      .join("");
  }
  // else if primaryimageurl is defined, return a single image tag with that as value for src
  else if (primaryimageurl !== undefined && primaryimageurl !== null) {
    return `<img src="${primaryimageurl}">`;
  }
  // else we have nothing, so return the empty string
  else {
    return "";
  }
}

//Fetches a new URL based on the category clicked inside #feature element
$("#feature").on("click", "a", async function (event) {
  //Stores the href value on clicked object
  const feature = $(this).attr("href");
  event.preventDefault();

  if (feature.startsWith("mailto")) {
    return;
  }

  onFetchStart();
  try {
    // fetches the href
    const response = await fetch(feature);
    const data = await response.json();

    // render it into the preview
    updatePreview(data.records, data);
  } catch (error) {
    console.error(error);
  } finally {
    onFetchEnd();
  }
});
