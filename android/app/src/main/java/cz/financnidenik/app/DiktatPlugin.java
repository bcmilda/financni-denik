package cz.financnidenik.app;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.speech.RecognizerIntent;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.ArrayList;

// Diktování v češtině přes systémové rozpoznávání řeči (Google).
// WebView v Androidu neumí Web Speech API, proto vlastní malý plugin.
// Z JavaScriptu: Capacitor.Plugins.Diktat.start({ prompt }) → { text }
@CapacitorPlugin(name = "Diktat")
public class DiktatPlugin extends Plugin {

    @PluginMethod
    public void start(PluginCall call) {
        Intent i = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        i.putExtra(RecognizerIntent.EXTRA_LANGUAGE, "cs-CZ");
        i.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);
        i.putExtra(RecognizerIntent.EXTRA_PROMPT, call.getString("prompt", "Mluv…"));
        try {
            startActivityForResult(call, i, "hotovo");
        } catch (ActivityNotFoundException e) {
            call.reject("nedostupne");
        }
    }

    @ActivityCallback
    private void hotovo(PluginCall call, ActivityResult result) {
        if (call == null) return;
        Intent data = result.getData();
        if (result.getResultCode() == Activity.RESULT_OK && data != null) {
            ArrayList<String> r = data.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);
            JSObject o = new JSObject();
            o.put("text", (r != null && !r.isEmpty()) ? r.get(0) : "");
            call.resolve(o);
        } else {
            call.reject("zruseno");
        }
    }
}
