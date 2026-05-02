function filterProperties(category, value) {
    isFiltered = true;

    if (category === "location") {
        filteredProperties = properties.filter(function(p) {
            return p.location.toLowerCase() === value.toLowerCase();
        });
    }

    if (category === "type") {
        filteredProperties = properties.filter(function(p) {
            return p.property_type.toLowerCase() === value.toLowerCase();
        });
    }

    displayCards(filteredProperties);
}
