const cds = require('@sap/cds');

module.exports = cds.service.impl(async function () {

    const { PurchaseRequests, PurchaseRequestItems } = this.entities;

    async function recalcItem(item) {
        item.ItemAmount = (item.Quantity || 0) * (item.Price || 0);
    }

    async function recalcTotal(tx, prId) {
        const items = await tx.read(PurchaseRequestItems).where({ pr_ID: prId });
        const total = items.reduce((sum, it) => sum + (it.ItemAmount || 0), 0);
        await tx.update(PurchaseRequests, prId).with({ TotalAmount: total });
    }

    this.before(['CREATE', 'UPDATE'], PurchaseRequestItems, async (req) => {
        await recalcItem(req.data);
    });

    this.after(['CREATE', 'UPDATE', 'DELETE'], PurchaseRequestItems, async (data, req) => {
        const prId = req.data.pr_ID || (data && data.pr_ID);
        if (prId) await recalcTotal(this.tx(req), prId);
    });

    this.before('CREATE', PurchaseRequests, async (req) => {
        if (!req.data.Status) req.data.Status = 'NEW';
        if (!req.data.PrNumber) {
            const count = await this.tx(req).read(PurchaseRequests);
            req.data.PrNumber = 'PR' + String(count.length + 1).padStart(6, '0');
        }
    });

    // NB: on ecrit via cds.db (et non via 'this', le service applicatif),
    // car les handlers generiques du service filtrent automatiquement les
    // champs @readonly meme pour des ecritures internes. La couche db ne
    // fait pas ce filtrage.

    this.on('submit', PurchaseRequests, async (req) => {
        const db = cds.db.tx(req);
        const pr = await db.read(PurchaseRequests, req.params[0]);
        if (!pr) return req.error(404, 'Purchase Request introuvable');
        if (pr.Status !== 'NEW') {
            return req.error(400, `Impossible de soumettre : statut actuel "${pr.Status}" (attendu: NEW)`);
        }
        await db.update(PurchaseRequests, req.params[0]).with({ Status: 'SUBMITTED' });
        return db.read(PurchaseRequests, req.params[0]);
    });

    this.on('approve', PurchaseRequests, async (req) => {
        const db = cds.db.tx(req);
        const pr = await db.read(PurchaseRequests, req.params[0]);
        if (!pr) return req.error(404, 'Purchase Request introuvable');
        if (pr.Status !== 'SUBMITTED') {
            return req.error(400, `Impossible d'approuver : statut actuel "${pr.Status}" (attendu: SUBMITTED)`);
        }
        await db.update(PurchaseRequests, req.params[0]).with({ Status: 'APPROVED' });
        return db.read(PurchaseRequests, req.params[0]);
    });

    this.on('reject', PurchaseRequests, async (req) => {
        const db = cds.db.tx(req);
        const pr = await db.read(PurchaseRequests, req.params[0]);
        if (!pr) return req.error(404, 'Purchase Request introuvable');
        if (pr.Status !== 'SUBMITTED') {
            return req.error(400, `Impossible de rejeter : statut actuel "${pr.Status}" (attendu: SUBMITTED)`);
        }
        if (!req.data.reason) {
            return req.error(400, 'Le motif de rejet est obligatoire');
        }
        await db.update(PurchaseRequests, req.params[0]).with({
            Status: 'REJECTED',
            RejectReason: req.data.reason
        });
        return db.read(PurchaseRequests, req.params[0]);
    });

});
