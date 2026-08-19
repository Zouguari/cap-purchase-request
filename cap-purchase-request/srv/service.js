const cds = require('@sap/cds');
const { analyzePurchaseRequest } = require('./ai-analysis');

module.exports = cds.service.impl(async function () {

    const { PurchaseRequests, PurchaseRequestItems } = this.entities;

    async function recalcItem(item) {
        item.ItemAmount = (Number(item.Quantity) || 0) * (Number(item.Price) || 0);
    }

    async function recalcTotal(tx, prId) {
        const items = await tx.read(PurchaseRequestItems);
        const prItems = items.filter(it => (it.pr_ID || (it.pr && it.pr.ID)) === prId);
        let total = 0;
        for (const it of prItems) {
            const expectedAmount = (Number(it.Quantity) || 0) * (Number(it.Price) || 0);
            total += expectedAmount;
            await tx.update(PurchaseRequestItems, it.ID).with({ ItemAmount: expectedAmount });
        }
        await tx.update(PurchaseRequests, prId).with({ TotalAmount: total });
    }

    this.before(['CREATE', 'UPDATE'], PurchaseRequestItems, async (req) => {
        await recalcItem(req.data);
    });

    this.after(['CREATE', 'UPDATE', 'DELETE'], PurchaseRequestItems, async (data, req) => {
        let prId = (data && (data.pr_ID || (data.pr && data.pr.ID))) || (req.data && (req.data.pr_ID || (req.data.pr && req.data.pr.ID)));
        if (!prId && data && data.ID) {
            const item = await this.tx(req).read(PurchaseRequestItems, data.ID);
            if (item) prId = item.pr_ID || (item.pr && item.pr.ID);
        }
        if (prId) await recalcTotal(this.tx(req), prId);
    });

    this.after('CREATE', PurchaseRequests, async (data, req) => {
        if (data && data.ID) {
            await recalcTotal(this.tx(req), data.ID);
        }
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
        const param = req.params && req.params[0];
        const prId = typeof param === 'string' ? param : (param && param.ID);
        const pr = await db.read(PurchaseRequests, prId);
        if (!pr) return req.error(404, 'Purchase Request introuvable');
        if (pr.Status !== 'NEW') {
            return req.error(400, `Impossible de soumettre : statut actuel "${pr.Status}" (attendu: NEW)`);
        }
        await db.update(PurchaseRequests, prId).with({ Status: 'SUBMITTED' });
        return db.read(PurchaseRequests, prId);
    });

    this.on('approve', PurchaseRequests, async (req) => {
        const db = cds.db.tx(req);
        const param = req.params && req.params[0];
        const prId = typeof param === 'string' ? param : (param && param.ID);
        const pr = await db.read(PurchaseRequests, prId);
        if (!pr) return req.error(404, 'Purchase Request introuvable');
        if (pr.Status !== 'SUBMITTED') {
            return req.error(400, `Impossible d'approuver : statut actuel "${pr.Status}" (attendu: SUBMITTED)`);
        }
        await db.update(PurchaseRequests, prId).with({ Status: 'APPROVED' });
        return db.read(PurchaseRequests, prId);
    });

    this.on('reject', PurchaseRequests, async (req) => {
        const db = cds.db.tx(req);
        const param = req.params && req.params[0];
        const prId = typeof param === 'string' ? param : (param && param.ID);
        const pr = await db.read(PurchaseRequests, prId);
        if (!pr) return req.error(404, 'Purchase Request introuvable');
        if (pr.Status !== 'SUBMITTED') {
            return req.error(400, `Impossible de rejeter : statut actuel "${pr.Status}" (attendu: SUBMITTED)`);
        }
        if (!req.data.reason) {
            return req.error(400, 'Le motif de rejet est obligatoire');
        }
        await db.update(PurchaseRequests, prId).with({
            Status: 'REJECTED',
            RejectReason: req.data.reason
        });
        return db.read(PurchaseRequests, prId);
    });

    this.on('analyzeWithAI', PurchaseRequests, async (req) => {
        const db = cds.db.tx(req);
        const param = req.params && req.params[0];
        const prId = typeof param === 'string' ? param : (param && param.ID) || (param && param.pr_ID);

        const pr = await db.read(PurchaseRequests, prId);
        if (!pr) return req.error(404, 'Purchase Request introuvable');
        
        const allItems = await db.read(PurchaseRequestItems);
        const items = allItems.filter(it => (it.pr_ID || (it.pr && it.pr.ID)) === prId);

        let calculatedTotal = 0;
        pr.Items = items.map(it => {
            const qty = Number(it.Quantity) || 0;
            const price = Number(it.Price) || 0;
            const itemAmount = qty * price;
            calculatedTotal += itemAmount;
            return {
                ...it,
                ItemAmount: itemAmount
            };
        });

        pr.TotalAmount = calculatedTotal > 0 ? calculatedTotal : (Number(pr.TotalAmount) || 0);

        return await analyzePurchaseRequest(pr);
    });

});
