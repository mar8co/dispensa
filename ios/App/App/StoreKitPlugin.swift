import Foundation
import Capacitor
import StoreKit

// Plugin StoreKit 2 "fatto in casa" (Fase 3). Espone al JS il minimo
// indispensabile per gli abbonamenti: elencare i prodotti, comprare,
// ripristinare. La VERIFICA vera NON avviene qui: il client prende la
// transazione firmata da Apple (JWS) e la manda a /api/receipt, che interroga
// l'App Store Server API e scrive gli entitlements col service role. Stessa
// filosofia di server/apns.js: poche righe native, la fiducia sta sul server.
@objc(StoreKitPlugin)
public class StoreKitPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "StoreKitPlugin"
    public let jsName = "StoreKit"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getProducts", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restore", returnType: CAPPluginReturnPromise),
    ]

    // Ascolto perpetuo delle transazioni che arrivano FUORI da un acquisto
    // esplicito: rinnovi automatici mentre l'app è aperta, acquisti approvati in
    // ritardo (Ask-to-Buy), acquisti fatti su un altro dispositivo. Ogni evento
    // viene passato al JS (transactionUpdated) perché risincronizzi col server.
    private var updatesTask: Task<Void, Never>?

    public override func load() {
        updatesTask = Task { [weak self] in
            for await result in Transaction.updates {
                await self?.deliver(result, asEvent: true)
            }
        }
    }

    deinit { updatesTask?.cancel() }

    // Prezzi/nomi localizzati dallo Store (il paywall usa comunque le costanti
    // di premium.js come fallback). `ids` = gli id configurati su App Store Connect.
    @objc func getProducts(_ call: CAPPluginCall) {
        let ids = call.getArray("ids", String.self) ?? []
        Task {
            do {
                let products = try await Product.products(for: ids)
                let out = products.map { p -> [String: Any] in
                    [
                        "id": p.id,
                        "displayName": p.displayName,
                        "description": p.description,
                        "price": p.displayPrice,
                    ]
                }
                call.resolve(["products": out])
            } catch {
                call.reject("Prodotti non leggibili: \(error.localizedDescription)")
            }
        }
    }

    // Avvia l'acquisto. `appAccountToken` (l'uid Supabase) viene legato alla
    // transazione e RIFIRMATO da Apple: così il server può verificare che la
    // ricevuta appartenga davvero a chi la presenta (anti-furto di ricevuta).
    @objc func purchase(_ call: CAPPluginCall) {
        guard let id = call.getString("id") else {
            call.reject("Manca l'id del prodotto.")
            return
        }
        var options: Set<Product.PurchaseOption> = []
        if let raw = call.getString("appAccountToken"), let uuid = UUID(uuidString: raw) {
            options.insert(.appAccountToken(uuid))
        }
        Task {
            do {
                guard let product = try await Product.products(for: [id]).first else {
                    call.reject("Prodotto non trovato: \(id)")
                    return
                }
                let result = try await product.purchase(options: options)
                switch result {
                case .success(let verification):
                    var payload = self.describe(verification)
                    payload["status"] = "purchased"
                    // Chiudiamo la transazione: la fonte di verità è il server
                    // (verifica ricevuta + notifiche Apple). Non chiuderla la
                    // farebbe ripresentare ad ogni avvio.
                    await self.finish(verification)
                    call.resolve(payload)
                case .userCancelled:
                    call.resolve(["status": "cancelled"])
                case .pending:
                    // Ask-to-Buy / autorizzazione richiesta: l'esito arriverà da
                    // Transaction.updates (evento transactionUpdated).
                    call.resolve(["status": "pending"])
                @unknown default:
                    call.resolve(["status": "unknown"])
                }
            } catch {
                call.reject("Acquisto non riuscito: \(error.localizedDescription)")
            }
        }
    }

    // Ripristina gli abbonamenti attivi (nuovo dispositivo, reinstallazione):
    // rimanda al JS tutte le transazioni correnti da risincronizzare col server.
    @objc func restore(_ call: CAPPluginCall) {
        Task {
            var out: [[String: Any]] = []
            for await result in Transaction.currentEntitlements {
                out.append(self.describe(result))
            }
            call.resolve(["entitlements": out])
        }
    }

    // MARK: - Helper

    // Estrae i dati utili dalla transazione, verificata o no: NON ci fidiamo del
    // client, il JWS verrà verificato dal server.
    private func describe(_ result: VerificationResult<Transaction>) -> [String: Any] {
        let t: Transaction
        switch result {
        case .verified(let v): t = v
        case .unverified(let v, _): t = v
        }
        return [
            "jws": result.jwsRepresentation,
            "transactionId": String(t.id),
            "originalTransactionId": String(t.originalID),
            "productId": t.productID,
        ]
    }

    private func finish(_ result: VerificationResult<Transaction>) async {
        switch result {
        case .verified(let t), .unverified(let t, _):
            await t.finish()
        }
    }

    private func deliver(_ result: VerificationResult<Transaction>, asEvent: Bool) async {
        if asEvent {
            notifyListeners("transactionUpdated", data: describe(result))
        }
        await finish(result)
    }
}
