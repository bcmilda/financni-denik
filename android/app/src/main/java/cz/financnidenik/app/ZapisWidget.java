package cz.financnidenik.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.widget.RemoteViews;

// Widget na ploše: „+ Výdaj“ otevře rychlý zápis, „Diktovat“ ho otevře se zapnutým mikrofonem.
// Obojí jen otevře appku přes odkaz financnidenik://zapis – zápis sám dělá webová část (blocek.js).
public class ZapisWidget extends AppWidgetProvider {

    private static PendingIntent odkaz(Context ctx, String url, int kod) {
        Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
        i.setClass(ctx, MainActivity.class);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        return PendingIntent.getActivity(ctx, kod, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    @Override
    public void onUpdate(Context ctx, AppWidgetManager mgr, int[] ids) {
        for (int id : ids) {
            RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_zapis);
            v.setOnClickPendingIntent(R.id.w_vydaj, odkaz(ctx, "financnidenik://zapis", 1));
            v.setOnClickPendingIntent(R.id.w_mic, odkaz(ctx, "financnidenik://zapis?mic=1", 2));
            v.setOnClickPendingIntent(R.id.w_kniha, odkaz(ctx, "financnidenik://den", 3));
            mgr.updateAppWidget(id, v);
        }
    }
}
