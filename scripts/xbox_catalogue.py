import requests
import re


# Microsoft Store Xbox categories
BASE_URL = "https://www.microsoft.com/en-gb/store/most-popular/games/xbox"
BEST_RATED_URL = "https://www.microsoft.com/en-gb/store/best-rated/games/xbox"
COMING_SOON_URL = "https://www.microsoft.com/en-gb/store/coming-soon/games/xbox"
NEW_RELEASES_URL = "https://www.microsoft.com/en-gb/store/new/games/xbox"
TOP_FREE_URL = "https://www.microsoft.com/en-gb/store/top-free/games/xbox"
TOP_PAID_URL = "https://www.microsoft.com/en-gb/store/top-paid/games/xbox"
DEALS_URL = "https://www.microsoft.com/en-gb/store/deals/games/xbox"


PAGE_SIZE = 50

all_product_ids = set()


def fetch_category(url, pages):

    category_product_ids = set()

    for page in range(pages):
        skip_items = page * PAGE_SIZE

        category_url = f"{url}?skipitems={skip_items}"

        print(f"Fetching page {page + 1}/{pages}...")

        response = requests.get(category_url)

        if response.status_code != 200:
            print(f"Failed with status {response.status_code}")
            continue

        product_ids = re.findall(
            r'"productId"\s*:\s*"([^"]+)"',
            response.text
        )

        print(f"  Found {len(product_ids)} products")

        category_product_ids.update(product_ids)
        all_product_ids.update(product_ids)

    return len(category_product_ids)


# Fetch categories
most_played_count = fetch_category(BASE_URL, 10)
best_rated_count = fetch_category(BEST_RATED_URL, 11)
coming_soon_count = fetch_category(COMING_SOON_URL, 5)
new_releases_count = fetch_category(NEW_RELEASES_URL, 20)
top_free_count = fetch_category(TOP_FREE_URL, 5)
top_paid_count = fetch_category(TOP_PAID_URL, 20)
deals_count = fetch_category(DEALS_URL, 20)


print()
print("--------------------------------")
print("Products found by category:")
print("--------------------------------")

print(f"Most Played:    {most_played_count}")
print(f"Best Rated:     {best_rated_count}")
print(f"Coming Soon:    {coming_soon_count}")
print(f"New Releases:   {new_releases_count}")
print(f"Top Free:       {top_free_count}")
print(f"Top Paid:       {top_paid_count}")
print(f"Deals:          {deals_count}")
print("--------------------------------")
print(f"Unique products: {len(all_product_ids)}")
print("--------------------------------")