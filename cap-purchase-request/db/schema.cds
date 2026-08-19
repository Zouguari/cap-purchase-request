namespace my.purchase;

entity PurchaseRequests {
    key ID            : UUID;
    PrNumber          : String(10);
    Requester         : String(12);
    Description       : String(100) @mandatory;
    Category          : String(10)  @mandatory;
    Priority          : String(6)   @mandatory;
    Status            : String(10)  default 'NEW' @readonly;
    RequestedDate     : Date        @mandatory;
    TotalAmount       : Decimal(15,2) default 0 @readonly;
    Currency          : String(5)  default 'EUR';
    RejectReason      : String(255) @readonly;
    CreatedAt         : Timestamp  @cds.on.insert: $now @readonly;
    LastChangedAt     : Timestamp  @cds.on.insert: $now @cds.on.update: $now @readonly;

    Items             : Composition of many PurchaseRequestItems on Items.pr = $self;
}

entity PurchaseRequestItems {
    key ID          : UUID;
    pr              : Association to PurchaseRequests;
    ItemNumber      : String(5);
    Product         : String(40)   @mandatory;
    Quantity        : Decimal(13,3) @mandatory;
    Unit            : String(3);
    Price           : Decimal(15,2) @mandatory;
    Currency        : String(5) default 'EUR';
    ItemAmount      : Decimal(15,2) @readonly;
}
