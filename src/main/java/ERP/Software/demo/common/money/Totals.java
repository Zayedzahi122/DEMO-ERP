package ERP.Software.demo.common.money;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Invoice money maths shared by the sales, purchase and quotation services, so
 * all three round identically and none of them can produce a negative total.
 */
public final class Totals {

    private Totals() {
    }

    /**
     * Tax-exclusive: the rate is added on top of the entered prices, which is what a
     * price list normally means. The customer pays {@code taxable + tax}.
     */
    public static Result of(BigDecimal subtotal, BigDecimal discount, BigDecimal vatRate, int scale) {
        return of(subtotal, discount, vatRate, scale, false);
    }

    /**
     * @param subtotal sum of the line totals
     * @param discount discount to apply; a negative value is treated as zero and
     *                 anything above the subtotal is capped
     * @param vatRate  tax as a fraction, e.g. {@code 0.05} for 5%. Null or zero
     *                 means no tax at all, whatever the mode.
     * @param scale    decimal places to round money to
     * @param inclusive when true the entered prices already contain the tax, so it
     *                  is extracted out of them and the total stays the entered
     *                  amount. When false the tax is added on top.
     */
    public static Result of(BigDecimal subtotal, BigDecimal discount, BigDecimal vatRate,
                            int scale, boolean inclusive) {
        BigDecimal sub = subtotal != null ? subtotal : BigDecimal.ZERO;
        BigDecimal disc = discount != null ? discount : BigDecimal.ZERO;
        if (disc.signum() < 0) {
            disc = BigDecimal.ZERO;
        }
        if (disc.compareTo(sub) > 0) {
            disc = sub;
        }

        BigDecimal gross = sub.subtract(disc);
        BigDecimal rate = vatRate != null ? vatRate : BigDecimal.ZERO;
        if (rate.signum() <= 0) {
            // "No tax" mode: nothing is added and nothing is extracted, so the
            // result is identical for both inclusive and exclusive.
            return new Result(sub, disc, BigDecimal.ZERO.setScale(scale), gross.setScale(scale, RoundingMode.HALF_UP));
        }

        BigDecimal tax;
        BigDecimal total;
        if (inclusive) {
            // The gross already is the price including tax, so the net is the gross
            // divided by (1 + rate) and the tax is whatever is left over.
            BigDecimal net = gross.divide(BigDecimal.ONE.add(rate), 10, RoundingMode.HALF_UP);
            tax = gross.subtract(net).setScale(scale, RoundingMode.HALF_UP);
            total = gross.setScale(scale, RoundingMode.HALF_UP);
        } else {
            tax = gross.multiply(rate).setScale(scale, RoundingMode.HALF_UP);
            total = gross.add(tax).setScale(scale, RoundingMode.HALF_UP);
        }

        return new Result(sub, disc, tax, total);
    }

    public record Result(BigDecimal subtotal, BigDecimal discount, BigDecimal taxAmount, BigDecimal totalAmount) {
    }
}
