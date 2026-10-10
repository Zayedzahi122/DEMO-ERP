package ERP.Software.demo.common.money;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * The tax maths every document type shares. These cover the three combinations
 * the settings actually allow: no tax, tax exclusive and tax inclusive.
 */
class TotalsTest {

    private static final BigDecimal FIVE_PERCENT = new BigDecimal("0.05");

    @Test
    void zeroRateChargesNothing() {
        Totals.Result r = Totals.of(new BigDecimal("100"), BigDecimal.ZERO, BigDecimal.ZERO, 3, false);

        assertEquals(0, new BigDecimal("100").compareTo(r.totalAmount()));
        assertEquals(0, BigDecimal.ZERO.compareTo(r.taxAmount()));
    }

    @Test
    void zeroRateIsTheSameWhetherInclusiveOrNot() {
        Totals.Result excl = Totals.of(new BigDecimal("100"), BigDecimal.ZERO, BigDecimal.ZERO, 3, false);
        Totals.Result incl = Totals.of(new BigDecimal("100"), BigDecimal.ZERO, BigDecimal.ZERO, 3, true);

        assertEquals(excl.totalAmount(), incl.totalAmount());
        assertEquals(excl.taxAmount(), incl.taxAmount());
    }

    @Test
    void exclusiveAddsTaxOnTop() {
        Totals.Result r = Totals.of(new BigDecimal("100"), BigDecimal.ZERO, FIVE_PERCENT, 3, false);

        assertEquals(0, new BigDecimal("105.000").compareTo(r.totalAmount()));
        assertEquals(0, new BigDecimal("5.000").compareTo(r.taxAmount()));
    }

    @Test
    void inclusiveLeavesTheTotalUnchangedAndExtractsTheTax() {
        Totals.Result r = Totals.of(new BigDecimal("100"), BigDecimal.ZERO, FIVE_PERCENT, 3, true);

        // The customer still pays 100 - that is what inclusive means.
        assertEquals(0, new BigDecimal("100.000").compareTo(r.totalAmount()));
        // 100 gross contains 5% tax, so the net is 100 / 1.05 = 95.238.
        assertEquals(0, new BigDecimal("4.762").compareTo(r.taxAmount()));
    }

    @Test
    void discountIsTakenOffBeforeTax() {
        Totals.Result r = Totals.of(new BigDecimal("100"), new BigDecimal("10"), FIVE_PERCENT, 3, false);

        assertEquals(0, new BigDecimal("10.000").compareTo(r.discount()));
        assertEquals(0, new BigDecimal("4.500").compareTo(r.taxAmount()));
        assertEquals(0, new BigDecimal("94.500").compareTo(r.totalAmount()));
    }

    @Test
    void discountOverTheSubtotalIsCappedRatherThanGoingNegative() {
        Totals.Result r = Totals.of(new BigDecimal("100"), new BigDecimal("500"), FIVE_PERCENT, 3, false);

        assertEquals(0, new BigDecimal("100.000").compareTo(r.discount()));
        assertEquals(0, BigDecimal.ZERO.compareTo(r.taxAmount()));
        assertEquals(0, BigDecimal.ZERO.compareTo(r.totalAmount()));
    }

    @Test
    void negativeDiscountIsTreatedAsNone() {
        Totals.Result r = Totals.of(new BigDecimal("100"), new BigDecimal("-50"), FIVE_PERCENT, 3, false);

        assertEquals(0, BigDecimal.ZERO.compareTo(r.discount()));
        assertEquals(0, new BigDecimal("105.000").compareTo(r.totalAmount()));
    }

    @Test
    void nullsAreTreatedAsZeroRatherThanThrowing() {
        Totals.Result r = Totals.of(null, null, null, 3, false);

        assertEquals(0, BigDecimal.ZERO.compareTo(r.subtotal()));
        assertEquals(0, BigDecimal.ZERO.compareTo(r.totalAmount()));
    }
}