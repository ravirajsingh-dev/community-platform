import React, { useEffect, useState } from "react";
import { getHowItWorksSettings } from "@src/actions/mediaActions";
import HomeSectionHeader from "./HomeSectionHeader";
import ScrollReveal from "./ScrollReveal";

const Process = () => {
  const [settings, setSettings] = useState({
    title: "",
    description: "",
    steps: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchSettings = async () => {
      try {
        const data = await getHowItWorksSettings();
        if (cancelled) {
          return;
        }
        setSettings({
          title: data?.title || "",
          description: data?.description || "",
          steps: Array.isArray(data?.steps) ? data.steps : [],
        });
      } catch (error) {
        console.error("Error loading how it works settings:", error);
        if (!cancelled) {
          setSettings({ title: "", description: "", steps: [] });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchSettings();
    return () => {
      cancelled = true;
    };
  }, []);

  const steps = (settings.steps || []).slice(0, 10);
  const stepCount = steps.length;

  if (loading || stepCount === 0) {
    return null;
  }

  return (
    <section className="home-process home-section-surface">
      <div className="container">
        <HomeSectionHeader
          title={settings.title}
          description={settings.description}
        />

        <ol
          className="home-process__steps"
          data-step-count={stepCount}
        >
          {steps.map((step, index) => (
            <ScrollReveal
              key={step.id || `${step.heading}-${index}`}
              as="li"
              className="home-process__step"
              delay={index * 80}
            >
              <div className="home-process__marker">
                <span className="home-process__number">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {index < stepCount - 1 ? (
                  <span className="home-process__connector" aria-hidden="true" />
                ) : null}
              </div>
              <div className="home-process__body">
                <h3 className="home-process__title">{step.heading}</h3>
                <p className="home-process__desc">{step.description}</p>
              </div>
            </ScrollReveal>
          ))}
        </ol>
      </div>
    </section>
  );
};

export default Process;
