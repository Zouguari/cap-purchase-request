using my.purchase as db from '../db/schema';

// Simule le service ZUI_PURCHASEREQUEST du RAP.
// Memes entites, memes actions (submit/approve/reject), memes transitions
// de statut. Peut etre remplace plus tard par le vrai service distant
// sans changer le reste de l'architecture CAP.
service PurchaseRequestService {

    entity PurchaseRequests as projection on db.PurchaseRequests actions {
        action submit() returns PurchaseRequests;
        action approve() returns PurchaseRequests;
        action reject(reason: String(255)) returns PurchaseRequests;
    };

    entity PurchaseRequestItems as projection on db.PurchaseRequestItems;
}
