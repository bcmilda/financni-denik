package cz.financnidenik.app;

import android.content.Context;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.webkit.WebView;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

// Kronika do PDF: Android WebView neumí window.print(), proto tisk přes systémový PrintManager
// (v dialogu jde zvolit „Uložit jako PDF“). Tiskne se aktuální stránka s pravidly @media print.
@CapacitorPlugin(name = "Tisk")
public class TiskPlugin extends Plugin {
    @PluginMethod
    public void tiskni(PluginCall call) {
        final String nazev = call.getString("nazev", "Finanční deník");
        getActivity().runOnUiThread(() -> {
            try {
                WebView wv = getBridge().getWebView();
                PrintManager pm = (PrintManager) getActivity().getSystemService(Context.PRINT_SERVICE);
                PrintDocumentAdapter ad = wv.createPrintDocumentAdapter(nazev);
                PrintAttributes at = new PrintAttributes.Builder().setMediaSize(PrintAttributes.MediaSize.ISO_A4).build();
                pm.print(nazev, ad, at);
                call.resolve();
            } catch (Exception e) {
                call.reject("Tisk se nepodařilo spustit: " + e.getMessage());
            }
        });
    }
}
