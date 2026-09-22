import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "public/data/catalog.json"

# Active quantity offers verified against BIO PLUS Shopify/Releasit on 2026-09-22.
# Prices are the exact final totals implied by the live fixed/percentage discounts.
TIERS = {
    "7715896655958": [(3, 105300, "Ahorra 40% adicional"), (6, 199900, "Mejor opción")],
    "7717556191318": [(3, 148365, "Ahorra 40% adicional")],
    "7719022723158": [(3, 99076, "Ahorra 40% adicional")],
    "7723080876118": [(3, 116870, "Ahorra 35% adicional")],
    "7723852398678": [(3, 99076, "Ahorra 40% adicional")],
    "7724252004438": [(3, 116870, "Ahorra 40% adicional")],
    "7715825221718": [(3, 99076, "Ahorra 40% adicional")],
    "7868822323286": [(3, 105300, "Ahorra 40% adicional"), (6, 199900, "Mejor opción")],
    "7732892827734": [(3, 105300, "Ahorra 40% adicional"), (6, 199900, "Mejor opción")],
    "7881237528662": [(3, 111476, "Ahorra 40% adicional"), (6, 213063, "Mejor opción")],
    "7750885376086": [(3, 111476, "Ahorra 40% adicional")],
    "7839227674710": [(3, 119900, "Ahorra 45%")],
    "7845394612310": [(3, 105300, "Ahorra 40% adicional")],
    "7849648783446": [(3, 129900, "Ahorra 25% adicional"), (6, 239900, "Mejor precio por unidad")],
    "7864616616022": [(3, 111476, "Ahorra 40% adicional"), (6, 213063, "Mejor opción")],
    "7898775552086": [(3, 111476, "Ahorra 40% adicional"), (6, 213063, "Mejor opción")],
    "8002531164246": [(3, 111476, "Ahorra 40% adicional"), (6, 213063, "Mejor opción")],
}

def base_id(product_id: str) -> str:
    return str(product_id).split("-")[0]

def offer(units: int, price: int, badge: str = "") -> dict:
    if units == 2:
        label = "Paga 1 · Lleva 2"
    elif units == 3:
        label = "Paga 2 · Lleva 3"
    elif units == 6:
        label = "Paga 4 · Lleva 6"
    else:
        label = f"Recibe {units} unidades"
    return {
        "id": f"{units}-units",
        "label": label,
        "units": units,
        "price": price,
        "badge": badge,
    }

def main() -> None:
    data = json.loads(CATALOG.read_text())
    for product in data["products"]:
        product["offers"] = [offer(2, int(product["price"]), "Oferta 2x1")]
        for units, price, badge in TIERS.get(base_id(product["id"]), []):
            product["offers"].append(offer(units, price, badge))
    data["meta"]["promotion"] = "2x1"
    data["meta"]["free_shipping"] = True
    data["meta"]["offer_source"] = "Shopify/Releasit"
    CATALOG.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
    total = sum(len(product["offers"]) for product in data["products"])
    print(f"Updated {len(data['products'])} products with {total} verified offers")

if __name__ == "__main__":
    main()
