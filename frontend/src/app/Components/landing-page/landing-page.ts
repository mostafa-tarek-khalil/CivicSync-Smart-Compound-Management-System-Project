import { AfterViewInit, Component, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './landing-page.html',
  styleUrl: './landing-page.css'
})
export class LandingPage implements AfterViewInit, OnDestroy {
  activeSection = 'home';
  private observer?: IntersectionObserver;

  ngAfterViewInit(): void {
    this.setupScrollTracking();
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  setActive(section: string): void {
    this.activeSection = section;
  }

  private setupScrollTracking(): void {
    const sections = document.querySelectorAll<HTMLElement>(
      '#home, #platform, #roles, #workflow'
    );

    if (!sections.length) {
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        const visibleSections = entries
          .filter(entry => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visibleSections.length > 0) {
          this.activeSection = visibleSections[0].target.id;
        }
      },
      {
        threshold: [0.15, 0.3, 0.5, 0.7],
        rootMargin: '-18% 0px -55% 0px'
      }
    );

    sections.forEach(section => {
      this.observer?.observe(section);
    });
  }
}