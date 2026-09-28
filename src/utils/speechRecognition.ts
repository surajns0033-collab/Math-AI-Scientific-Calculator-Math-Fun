// Speech-to-Text utility for accessible mathematical input

// Mapping for word numbers to digits
const NUMBER_WORDS: Record<string, string> = {
  zero: "0",
  one: "1",
  two: "2",
  three: "3",
  four: "4",
  five: "5",
  six: "6",
  seven: "7",
  eight: "8",
  nine: "9",
  ten: "10",
  eleven: "11",
  twelve: "12",
  thirteen: "13",
  fourteen: "14",
  fifteen: "15",
  sixteen: "16",
  seventeen: "17",
  eighteen: "18",
  nineteen: "19",
  twenty: "20",
  thirty: "30",
  forty: "40",
  fifty: "50",
  sixty: "60",
  seventy: "70",
  eighty: "80",
  ninety: "90",
  hundred: "100",
  thousand: "1000",
};

export function parseSpokenMathToExpression(transcript: string): string {
  let text = transcript.toLowerCase().trim();

  // Basic phrase replacements
  text = text.replace(/\bsquare root of\b/g, "sqrt(");
  text = text.replace(/\bsquare root\b/g, "sqrt(");
  text = text.replace(/\bcube root of\b/g, "cbrt(");
  text = text.replace(/\bcube root\b/g, "cbrt(");
  text = text.replace(/\bsine of\b/g, "sin(");
  text = text.replace(/\bsine\b/g, "sin(");
  text = text.replace(/\bcosine of\b/g, "cos(");
  text = text.replace(/\bcosine\b/g, "cos(");
  text = text.replace(/\btangent of\b/g, "tan(");
  text = text.replace(/\btangent\b/g, "tan(");
  text = text.replace(/\blog of\b/g, "log(");
  text = text.replace(/\blogarithm of\b/g, "log(");
  text = text.replace(/\bnatural log of\b/g, "ln(");
  text = text.replace(/\bopen parenthesis\b|\bopen bracket\b/g, "(");
  text = text.replace(/\bclose parenthesis\b|\bclose bracket\b/g, ")");

  // Operations
  text = text.replace(/\bplus\b/g, "+");
  text = text.replace(/\bminus\b|\bsubtract\b|\bnegative\b/g, "-");
  text = text.replace(/\btimes\b|\bmultiplied by\b|\binto\b/g, "*");
  text = text.replace(/\bdivided by\b|\bover\b/g, "/");
  text = text.replace(/\bequals\b|\bequal to\b/g, "=");
  text = text.replace(/\bto the power of\b|\bto the power\b|\braised to\b/g, "^");
  text = text.replace(/\bsquared\b/g, "^2");
  text = text.replace(/\bcubed\b/g, "^3");
  text = text.replace(/\bpercent\b/g, "%");
  text = text.replace(/\bdegrees\b/g, "");
  text = text.replace(/\bpi\b/g, "π");

  // Number words conversion
  Object.keys(NUMBER_WORDS).forEach((word) => {
    const reg = new RegExp(`\\b${word}\\b`, "g");
    text = text.replace(reg, NUMBER_WORDS[word]);
  });

  // Handle "point" -> "." e.g. "three point five" -> "3.5"
  text = text.replace(/(\d+)\s+point\s+(\d+)/g, "$1.$2");

  // Clean trailing parentheses if function was opened without closing
  const openParens = (text.match(/\(/g) || []).length;
  const closeParens = (text.match(/\)/g) || []).length;
  if (openParens > closeParens) {
    text += ")".repeat(openParens - closeParens);
  }

  // Remove superfluous words
  text = text.replace(/\b(what is|calculate|compute|solve|please)\b/g, "");
  return text.trim();
}

export class MathVoiceRecognizer {
  private recognition: any = null;
  public isSupported: boolean = false;
  public isListening: boolean = false;

  constructor() {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.isSupported = true;
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.lang = "en-US";
    }
  }

  start(
    onResult: (parsedMath: string, rawTranscript: string, isFinal: boolean) => void,
    onError: (error: string) => void,
    onEnd: () => void
  ) {
    if (!this.isSupported || !this.recognition) {
      onError("Voice recognition is not supported in this browser.");
      return;
    }

    this.isListening = true;

    this.recognition.onresult = (event: any) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      const raw = finalTranscript || interimTranscript;
      const parsed = parseSpokenMathToExpression(raw);
      onResult(parsed, raw, Boolean(finalTranscript));
    };

    this.recognition.onerror = (event: any) => {
      this.isListening = false;
      onError(event.error || "Speech recognition error");
    };

    this.recognition.onend = () => {
      this.isListening = false;
      onEnd();
    };

    try {
      this.recognition.start();
    } catch (e: any) {
      this.isListening = false;
      onError(e.message || "Could not start voice recognition");
    }
  }

  stop() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }
}
