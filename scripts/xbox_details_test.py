import requests


PRODUCT_IDS = [
    "bt5p2x999vh2",
    "bq1tn1t79v9k",
    "9mvxmvt8zkwc",
    "9p9ftxpkq35p",
    "c125w9bg2k0v",
]


base_url = "https://displaycatalog.mp.microsoft.com/v7.0/products"

params = {
    "bigIds": ",".join(PRODUCT_IDS),
    "market": "GB",
    "languages": "en-GB",
    "fieldsTemplate": "details",
}


print("Requesting Microsoft product details...")
print()

response = requests.get(base_url, params=params)

print("Status:", response.status_code)

if response.status_code != 200:
    print()
    print(response.text)
    exit()


data = response.json()

products = data.get("Products", [])

print("Products returned:", len(products))
print()


for product in products:

    product_id = product.get("ProductId")

    localized = product.get("LocalizedProperties", [{}])[0]

    title = localized.get("ProductTitle")


        # -----------------------------------------
    # Find UK price from full SKU
    # -----------------------------------------
    if product_id == "9P9FTXPKQ35P":
        print()
        print("========== FC 26 SKU DEBUG ==========")

        for sku in product.get("DisplaySkuAvailabilities", []):

            print("SKU:", sku.get("Sku"))

            for availability in sku.get("Availabilities", []):

                price_data = (
                    availability
                    .get("OrderManagementData", {})
                    .get("Price", {})
                )

                print("Markets:", availability.get("Markets"))
                print("Currency:", price_data.get("CurrencyCode"))
                print("List Price:", price_data.get("ListPrice"))
                print("MSRP:", price_data.get("MSRP"))
                print("--------------------------------")

    price = None
    original_price = None

    sku_availabilities = product.get("DisplaySkuAvailabilities", [])
    
    

    # First look for the main/full SKU.
    for sku in sku_availabilities:

        if sku.get("Sku", {}).get("SkuType") != "full":
            continue

        for availability in sku.get("Availabilities", []):

            # Make sure this availability is for the UK.
            if "GB" not in availability.get("Markets", []):
                continue

            price_data = (
                availability
                .get("OrderManagementData", {})
                .get("Price", {})
            )

            if price_data.get("CurrencyCode") != "GBP":
                continue

            price = price_data.get("ListPrice")
            original_price = price_data.get("MSRP")

            break

        if price is not None:
            break


    # -----------------------------------------
    # Find artwork
    # -----------------------------------------

    images = localized.get("Images", [])

    image_url = None

    for image in images:

        if image.get("ImagePurpose") == "BoxArt":
            image_url = image.get("Uri")
            break

    if not image_url:

        for image in images:

            if image.get("ImagePurpose") == "Poster":
                image_url = image.get("Uri")
                break


    # -----------------------------------------
    # Calculate discount
    # -----------------------------------------

    discount = None

    if (
        price is not None
        and original_price is not None
        and original_price > price
    ):

        discount = round(
            ((original_price - price) / original_price) * 100
        )


    # -----------------------------------------
    # Display results
    # -----------------------------------------

    print("--------------------------------")
    print("Product ID:", product_id)
    print("Title:", title)
    print("Price:", price)
    print("Original Price:", original_price)
    print(
        "Discount:",
        f"{discount}%" if discount is not None else "None"
    )
    print("Artwork:", image_url)